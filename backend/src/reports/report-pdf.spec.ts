import { inflateSync } from 'zlib';
import { buildReportDocument, type ReportScanRow } from './report-document';
import { generateReportPdf } from './report-pdf';

/**
 * Inflates every stream object in the buffer (pdfkit compresses page content
 * with zlib by default) so rendered text can be asserted directly.
 */
function extractContentText(pdf: Buffer): string {
  const raw = pdf.toString('latin1');
  const parts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(raw))) {
    const bytes = Buffer.from(match[1], 'latin1');
    let content: string;
    try {
      content = inflateSync(bytes).toString('latin1');
    } catch {
      content = match[1]; // uncompressed stream
    }
    // pdfkit writes text as TJ runs of hex glyph codes with kerning numbers
    // (e.g. `[<5052> 20 <4f> 50 <56> 80 <414e4345> 0] TJ`) — decode every hex
    // token and literal string, dropping the numeric adjustments, so rendered
    // text can be asserted directly.
    const decoded: string[] = [];
    const tokenRe = /<([0-9A-Fa-f]+)>|\(((?:[^()\\]|\\.)*)\)/g;
    let token: RegExpExecArray | null;
    while ((token = tokenRe.exec(content))) {
      if (token[1] !== undefined) {
        const hex = token[1];
        let text = '';
        for (let i = 0; i + 1 < hex.length; i += 2) {
          text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
        }
        decoded.push(text);
      } else {
        decoded.push(token[2].replace(/\\(.)/g, '$1'));
      }
    }
    parts.push(decoded.join(''));
  }
  // Text is WinAnsi/CP1252 encoded; map the em-dash byte back so section
  // titles like 'Appendix — Methodology' assert literally.
  return parts.join('\n').replace(/\x97/g, '—');
}

const SCAN: ReportScanRow = {
  id: 'scan_10000000-0000-4000-8000-000000000005',
  status: 'complete',
  original_filename: 'ceo-statement.mp4',
  mime_type: 'video/mp4',
  file_size_bytes: 64_000_000,
  created_at: '2026-07-10T09:00:00.000Z',
  updated_at: '2026-07-10T09:00:24.000Z',
  completed_at: '2026-07-10T09:00:24.000Z',
  processing_mode: 'standard',
  result_payload: {
    verdict: {
      class: 'suspicious',
      confidence: 0.88,
      display_label: 'Artifacts Detected',
      signal_count_total: 5,
      signal_count_completed: 4,
      plain_language_summary: 'Model signature detected with anomalous spectral energy.',
    },
    signals: [
      {
        signal_id: 'sig-1',
        signal_name: 'generative_fingerprint',
        signal_display_name: 'Generative fingerprint analysis',
        signal_category: 'generative',
        status: 'elevated',
        status_reason: 'Pattern aligns with a diffusion-style generation pipeline.',
        score: 0.96,
        signal_weight: 0.9,
      },
      {
        signal_id: 'sig-2',
        signal_name: 'continuity',
        signal_display_name: 'Frame continuity analysis',
        signal_category: 'continuity',
        status: 'elevated',
        status_reason: 'Frame-to-frame continuity breaks in the final 12 seconds.',
        score: 0.88,
        signal_weight: 0.8,
      },
    ],
    metadata: { recommendations: ['Escalate to editorial review.'] },
    methodology: { version: 'v2.4.1-stable' },
    report: { report_id: 'PRV-20260710-005', generated_at: '2026-07-10T09:00:24.000Z' },
  },
};

describe('generateReportPdf', () => {
  it('produces a valid non-empty PDF buffer', async () => {
    const document = buildReportDocument(SCAN);
    const pdf = await generateReportPdf(document);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1_000);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('produces a structurally complete PDF (metadata + compressed streams + trailer)', async () => {
    const document = buildReportDocument(SCAN);
    const pdf = await generateReportPdf(document);
    const text = pdf.toString('latin1');

    // The report id lives in the (uncompressed) document Info dictionary.
    expect(text).toContain('PRV-20260710-005');
    // Content streams are zlib-compressed — the /FlateDecode marker proves the
    // rendered sections made it into page streams.
    expect(text).toContain('/FlateDecode');
    expect(text).toContain('%%EOF');
    expect(text).toMatch(/\/Count \d+/);
  });

  it('renders even a bare document with no payload', async () => {
    const document = buildReportDocument({ ...SCAN, result_payload: null });
    const pdf = await generateReportPdf(document);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(500);
  });

  it('renders the evidence appendix (methodology + limitations) sections', async () => {
    const document = buildReportDocument(SCAN);
    const pdf = await generateReportPdf(document);
    const content = extractContentText(pdf);

    // sectionTitle renders uppercase in the PDF.
    expect(content).toContain('APPENDIX — METHODOLOGY');
    expect(content).toContain('APPENDIX — LIMITATIONS');
    // The methodology version is interpolated into the appendix copy.
    expect(content).toContain('v2.4.1-stable');
    expect(content).toContain('cannot prove original provenance');
  });

  it('renders the circular Verified with Provance seal on the cover', async () => {
    const document = buildReportDocument(SCAN);
    const pdf = await generateReportPdf(document);
    const content = extractContentText(pdf);

    // The seal's circular text is drawn character-by-character (this pdfkit
    // build has no textOnPath), so assert the phrase decodes contiguously
    // from the content stream. The gold check is a vector path, not text —
    // the phrase is the seal's text signature.
    expect(content).toContain('VERIFIED WITH PROVANCE');
  });
});
