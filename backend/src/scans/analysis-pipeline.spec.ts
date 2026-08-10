import { createHash } from 'crypto';
import { deflateSync } from 'zlib';
import { Jimp, rgbaToInt } from 'jimp';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { ScansService, buildVerdict } from './scans.service';

// ---------------------------------------------------------------------------
// Analysis pipeline tests — real image fixtures, controlled metadata.
//
// The pipeline is exercised against deterministic image bytes generated with
// Jimp (the same library the worker uses to compute visual statistics), so
// format detection, fingerprints, image stats, and the C2PA marker scan all
// run on real bytes. The one controlled input is EXIF: Jimp cannot write EXIF
// segments, so `exifr.parse` is stubbed per-fixture to simulate a clean
// capture (DateTimeOriginal + device) vs. an EXIF-stripped export (null).
// The verdict thresholds themselves are additionally locked with direct
// `buildVerdict` unit tests.
// ---------------------------------------------------------------------------

jest.mock('exifr', () => ({
  parse: jest.fn(),
}));

// Access the mocked parse implementation via jest.requireMock (CJS-safe — the
// mocked module object is only available after jest.mock has been hoisted).
function mockExifrParse() {
  return (jest.requireMock('exifr') as { parse: jest.Mock }).parse;
}

// ---------------------------------------------------------------------------
// Deterministic fixture generation
// ---------------------------------------------------------------------------

/** mulberry32 — seeded PRNG so every run produces identical pixels. */
function mulberry32(seed: number) {
  let state = seed;
  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** High-frequency noise image (96×96) — guarantees high entropy/edge density. */
async function makeNoiseImage(mime: 'image/jpeg' | 'image/png'): Promise<Buffer> {
  const rand = mulberry32(0xc0ffee);
  const size = 96;
  const image = new Jimp({ width: size, height: size, color: '#000000' });

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const red = Math.floor(rand() * 256);
      const green = Math.floor(rand() * 256);
      const blue = Math.floor(rand() * 256);
      image.setPixelColor(rgbaToInt(red, green, blue, 255), x, y);
    }
  }

  // Pin the JPEG quality explicitly so the encoded bytes (and therefore the
  // decoded image stats the verdict depends on) stay stable across jpeg-js
  // upgrades — a default-quality bump could silently flip fixture verdicts.
  return image.getBuffer(mime, mime === 'image/jpeg' ? { quality: 92 } : {});
}

/**
 * Minimal 8×8 RGB PNG with a tEXt chunk containing the "c2pa" marker — a real
 * provenance fixture the marker scanner detects in the byte stream.
 */
function makeC2paPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(8, 0); // width
  ihdr.writeUInt32BE(8, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  const raw = Buffer.alloc(8 * (1 + 8 * 3));
  for (let y = 0; y < 8; y += 1) {
    raw[y * 25] = 0; // filter: none
    for (let x = 0; x < 8; x += 1) {
      const offset = y * 25 + 1 + x * 3;
      raw[offset] = 120 + ((x * 13 + y * 7) % 60);
      raw[offset + 1] = 90 + ((x * 11 + y * 17) % 80);
      raw[offset + 2] = 150 + ((x * 19 + y * 5) % 50);
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('tEXt', Buffer.concat([Buffer.from('Comment\0', 'latin1'), Buffer.from('c2pa provenance marker embedded', 'latin1')])),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buffer: Buffer): number {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Scaffolding (mirrors scans.service.spec.ts)
// ---------------------------------------------------------------------------

function createConfigService() {
  return {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  } as unknown as ConfigService;
}

function createSupabaseService(client: unknown) {
  return {
    getAdminClient: jest.fn(() => client),
  } as unknown as SupabaseService;
}

function createBillingService() {
  return { assertScanQuota: jest.fn(async () => undefined) };
}

function createService() {
  return new ScansService(
    createSupabaseService(null),
    createConfigService(),
    undefined as never,
    createBillingService() as never,
  );
}

function scanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '01234567-abcd-4c2p-a000-000000000000',
    user_id: 'user-1',
    status: 'queued',
    original_filename: 'IMG_2026.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: 1024 * 1024,
    storage_bucket: 'provance-uploads',
    storage_path: 'user-1/scan-1/IMG_2026.jpg',
    processing_mode: 'standard',
    team_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    result_payload: null,
    failure_reason: null,
    completed_at: null,
    ...overrides,
  };
}

const ANALYSIS_TIMESTAMP = '2026-01-02T00:00:00.000Z';

/**
 * Drive the (private) analysis pipeline with a real fixture buffer. Casts to
 * the private method once, so the tests don't each repeat the escape hatch.
 */
function runAnalysis(service: ScansService, scan: Record<string, unknown>, buffer: Buffer) {
  return (
    service as unknown as {
      buildAnalysisResultPayload: (
        scan: Record<string, unknown>,
        buffer: Buffer,
        timestamp: string,
        startedAt: number,
      ) => Promise<Record<string, any>>;
    }
  ).buildAnalysisResultPayload(scan, buffer, ANALYSIS_TIMESTAMP, 1000);
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('scan analysis pipeline', () => {
  beforeEach(() => {
    mockExifrParse().mockReset();
  });

  describe('buildAnalysisResultPayload — fixture verdicts', () => {
    it('clean JPEG with capture metadata → likely_authentic', async () => {
      const jpeg = await makeNoiseImage('image/jpeg');
      mockExifrParse().mockResolvedValue({
        DateTimeOriginal: new Date('2026-01-01T10:00:00.000Z'),
        Software: 'Adobe Lightroom',
        Make: 'Canon',
        Model: 'EOS R5',
        Orientation: 1,
        ColorSpace: 1,
      });
      const service = createService();

      const payload = await runAnalysis(
        service,
        scanRow({
          mime_type: 'image/jpeg',
          original_filename: 'clean.jpg',
          file_size_bytes: jpeg.length,
        }),
        jpeg,
      );

      expect(payload.verdict.class).toBe('likely_authentic');
      expect(payload.verdict.display_label).toBe('Likely Authentic');
      expect(payload.verdict.signal_count_total).toBe(4);
      expect(payload.payload_version).toBe('1.0.0');

      const integrity = payload.signals.find(
        (signal: { signal_name: string }) => signal.signal_name === 'file_integrity',
      );
      expect(integrity.status).toBe('clear');
      expect(integrity.status_reason).toContain('matches the declared');

      const metadata = payload.signals.find(
        (signal: { signal_name: string }) => signal.signal_name === 'metadata_forensics',
      );
      expect(metadata.status).toBe('clear');

      expect(payload.metadata.header_matches_mime).toBe(true);
      expect(payload.metadata.capture_timestamp).toBe('2026-01-01T10:00:00.000Z');
      expect(payload.metadata.total_processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('EXIF-stripped PNG → inconclusive', async () => {
      const png = await makeNoiseImage('image/png');
      mockExifrParse().mockResolvedValue(null);
      const service = createService();

      const payload = await runAnalysis(
        service,
        scanRow({
          mime_type: 'image/png',
          original_filename: 'stripped.png',
          file_size_bytes: png.length,
        }),
        png,
      );

      expect(payload.verdict.class).toBe('inconclusive');
      expect(payload.metadata.capture_timestamp).toBeNull();
      expect(payload.metadata.header_matches_mime).toBe(true);

      const metadata = payload.signals.find(
        (signal: { signal_name: string }) => signal.signal_name === 'metadata_forensics',
      );
      expect(metadata.status).toBe('limited');
    });

    it('header-mismatch file (PNG bytes declared as JPEG) → suspicious', async () => {
      const png = await makeNoiseImage('image/png');
      mockExifrParse().mockResolvedValue(null);
      const service = createService();

      const payload = await runAnalysis(
        service,
        scanRow({
          mime_type: 'image/jpeg', // declared JPEG…
          original_filename: 'renamed.png', // …but the bytes are PNG
          file_size_bytes: png.length,
        }),
        png,
      );

      expect(payload.verdict.class).toBe('suspicious');
      expect(payload.metadata.header_matches_mime).toBe(false);
      expect(payload.metadata.detected_format).toBe('PNG');

      const integrity = payload.signals.find(
        (signal: { signal_name: string }) => signal.signal_name === 'file_integrity',
      );
      expect(integrity.status).toBe('warning');
      expect(integrity.status_reason).toContain('does not match detected file header');
    });

    it('PNG with an embedded C2PA marker → provenance signal clear + marker finding', async () => {
      const c2paPng = makeC2paPng();
      mockExifrParse().mockResolvedValue(null);
      const service = createService();

      const payload = await runAnalysis(
        service,
        scanRow({
          mime_type: 'image/png',
          original_filename: 'signed.png',
          file_size_bytes: c2paPng.length,
        }),
        c2paPng,
      );

      const provenance = payload.signals.find(
        (signal: { signal_name: string }) => signal.signal_name === 'provenance_credentials',
      );
      expect(provenance.status).toBe('clear');
      expect(provenance.findings[0].label).toContain('provenance marker detected');
      expect(payload.metadata.c2pa_marker_detected).toBe(true);
    });

    it('records real SHA-256/MD5 fingerprints of the fixture bytes', async () => {
      const png = await makeNoiseImage('image/png');
      mockExifrParse().mockResolvedValue(null);
      const service = createService();

      const payload = await runAnalysis(
        service,
        scanRow({ mime_type: 'image/png', file_size_bytes: png.length }),
        png,
      );

      expect(payload.media.sha256).toBe(createHash('sha256').update(png).digest('hex'));
      expect(payload.media.md5).toBe(createHash('md5').update(png).digest('hex'));
      expect(payload.media.file_size_bytes).toBe(png.length);
      expect(payload.report.report_id).toBe('PRV-01234567');
      expect(payload.methodology.version).toBe('0.2.0-mvp');
    });
  });

  describe('buildVerdict — threshold lock', () => {
    const cleanImageStats = {
      averageLuminance: 128,
      luminanceStdDev: 40,
      saturationMean: 0.5,
      edgeDensity: 0.5,
      entropy: 7.5,
      blockiness: 0.05,
    };

    const baseInput = {
      metadata: {
        captureTimestamp: '2026-01-01T10:00:00.000Z',
        software: 'Adobe Lightroom',
        make: 'Canon',
        model: 'EOS R5',
      },
      imageStats: cleanImageStats,
      hasHeaderMismatch: false,
      hasC2paMarker: false,
      signalCount: 4,
    };

    it('baseline clean inputs → likely_authentic (0.18 < 0.2)', () => {
      expect(buildVerdict(baseInput).class).toBe('likely_authentic');
    });

    it('header mismatch (+0.34 → 0.52) → suspicious', () => {
      expect(
        buildVerdict({ ...baseInput, hasHeaderMismatch: true }).class,
      ).toBe('suspicious');
    });

    it('missing capture timestamp (+0.05 → 0.23) → inconclusive', () => {
      expect(
        buildVerdict({
          ...baseInput,
          metadata: { ...baseInput.metadata, captureTimestamp: null },
        }).class,
      ).toBe('inconclusive');
    });

    it('editor software without device metadata (+0.12) → inconclusive', () => {
      expect(
        buildVerdict({
          ...baseInput,
          metadata: {
            captureTimestamp: '2026-01-01T10:00:00.000Z',
            software: 'GIMP',
            make: null,
            model: null,
          },
        }).class,
      ).toBe('inconclusive');
    });

    it('pronounced blockiness (+0.12) → inconclusive', () => {
      expect(
        buildVerdict({
          ...baseInput,
          imageStats: { ...cleanImageStats, blockiness: 0.17 },
        }).class,
      ).toBe('inconclusive');
    });

    it('low texture + entropy (+0.10) → inconclusive', () => {
      expect(
        buildVerdict({
          ...baseInput,
          imageStats: {
            ...cleanImageStats,
            edgeDensity: 0.03,
            entropy: 5.2,
          },
        }).class,
      ).toBe('inconclusive');
    });

    it('C2PA marker present (−0.08 → 0.10) → likely_authentic', () => {
      expect(
        buildVerdict({ ...baseInput, hasC2paMarker: true }).class,
      ).toBe('likely_authentic');
    });

    it('suspicion score clamps at 0.9 with a full penalty stack', () => {
      const result = buildVerdict({
        metadata: {
          captureTimestamp: null,
          software: 'GIMP',
          make: null,
          model: null,
        },
        imageStats: {
          ...cleanImageStats,
          blockiness: 0.17,
          edgeDensity: 0.03,
          entropy: 5.2,
        },
        hasHeaderMismatch: true,
        hasC2paMarker: false,
        signalCount: 4,
      });

      expect(result.class).toBe('suspicious');
      expect(result.confidence_score).toBeCloseTo(
        0.52 + 4 * 0.045,
        5,
      );
    });

    it('floating-point 0.45-boundary stack stays inconclusive (strict <)', () => {
      // 0.18 + 0.12 (editor) + 0.05 (no timestamp) + 0.10 (low texture)
      // accumulates to 0.44999999999999996 in IEEE-754, which is < 0.45, so
      // the strict `<` boundary keeps this inconclusive.
      expect(
        buildVerdict({
          metadata: {
            captureTimestamp: null,
            software: 'GIMP',
            make: null,
            model: null,
          },
          imageStats: {
            ...cleanImageStats,
            edgeDensity: 0.03,
            entropy: 5.2,
          },
          hasHeaderMismatch: false,
          hasC2paMarker: false,
          signalCount: 4,
        }).class,
      ).toBe('inconclusive');
    });

    it('same stack plus blockiness (0.57) → suspicious (crosses 0.45)', () => {
      // Adding the blockiness penalty (+0.12) pushes the accumulation to
      // 0.57, which crosses the 0.45 threshold → suspicious.
      expect(
        buildVerdict({
          metadata: {
            captureTimestamp: null,
            software: 'GIMP',
            make: null,
            model: null,
          },
          imageStats: {
            ...cleanImageStats,
            edgeDensity: 0.03,
            entropy: 5.2,
            blockiness: 0.17,
          },
          hasHeaderMismatch: false,
          hasC2paMarker: false,
          signalCount: 4,
        }).class,
      ).toBe('suspicious');
    });
  });
});
