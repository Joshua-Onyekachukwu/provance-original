import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import * as exifr from 'exifr';
import { Jimp } from 'jimp';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';
import { InitiateScanDto } from './dto/initiate-scan.dto';
import { ScanStatus } from './scans.types';

type ScanRow = {
  id: string;
  user_id: string;
  status: ScanStatus;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  result_payload: unknown | null;
  failure_reason: string | null;
};

type ImageStats = {
  width: number;
  height: number;
  averageLuminance: number;
  luminanceStdDev: number;
  saturationMean: number;
  edgeDensity: number;
  entropy: number;
  blockiness: number;
};

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);
  private readonly scansTable: string;
  private readonly uploadsBucket: string;
  private readonly maxUploadBytes: number;
  private readonly allowedMimeTypes: Set<string>;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {
    this.scansTable = this.configService.get<string>('SUPABASE_SCANS_TABLE', 'scans');
    this.uploadsBucket = this.configService.get<string>(
      'SUPABASE_UPLOADS_BUCKET',
      'provance-uploads',
    );
    this.maxUploadBytes = this.configService.get<number>(
      'MAX_UPLOAD_BYTES',
      50 * 1024 * 1024,
    );
    const mimeList = this.configService.get<string>(
      'ALLOWED_UPLOAD_MIME_TYPES',
      'image/jpeg,image/png,image/webp,image/gif',
    );
    this.allowedMimeTypes = new Set(
      mimeList
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  async initiateScan(userId: string, dto: InitiateScanDto) {
    if (dto.mediaType !== 'image') {
      throw new BadRequestException('Only image uploads are supported right now.');
    }

    if (!this.allowedMimeTypes.has(dto.mimeType)) {
      throw new BadRequestException('Unsupported file type.');
    }

    if (dto.fileSizeBytes > this.maxUploadBytes) {
      throw new BadRequestException('File exceeds the maximum allowed size.');
    }

    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scanId = randomUUID();
    const storagePath = `${userId}/${scanId}/${sanitizeFilename(dto.originalFilename)}`;
    const now = new Date().toISOString();

    const { error: insertError } = await adminClient.from(this.scansTable).insert({
      id: scanId,
      user_id: userId,
      status: 'awaiting_upload',
      original_filename: dto.originalFilename,
      mime_type: dto.mimeType,
      file_size_bytes: dto.fileSizeBytes,
      storage_bucket: this.uploadsBucket,
      storage_path: storagePath,
      result_payload: null,
      failure_reason: null,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      throw new ServiceUnavailableException('Failed to create scan record.');
    }

    const { data: signedUploadData, error: signedUploadError } = await adminClient.storage
      .from(this.uploadsBucket)
      .createSignedUploadUrl(storagePath);

    if (signedUploadError || !signedUploadData) {
      throw new ServiceUnavailableException('Failed to prepare upload URL.');
    }

    return {
      scanId,
      status: 'awaiting_upload' as const,
      bucket: this.uploadsBucket,
      path: storagePath,
      token: signedUploadData.token,
      signedUrl: signedUploadData.signedUrl,
    };
  }

  async submitScan(userId: string, scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanOrThrow(adminClient, userId, scanId);

    if (scan.status !== 'awaiting_upload') {
      throw new BadRequestException('Scan is not ready to be submitted.');
    }

    await this.updateScan(adminClient, scanId, {
      status: 'queued',
      updated_at: new Date().toISOString(),
    });

    if (this.queueService.isConfigured()) {
      await this.queueService.enqueueScanProcessing(scanId);
    } else {
      void this.runScanProcessing(adminClient, scan);
    }

    return { scanId, status: 'queued' as const };
  }

  async listScans(userId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from(this.scansTable)
      .select(
        'id,status,original_filename,mime_type,file_size_bytes,created_at,updated_at,failure_reason',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scans.');
    }

    return { scans: data ?? [] };
  }

  async getScan(userId: string, scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanOrThrow(adminClient, userId, scanId);

    return { scan };
  }

  async processQueuedScan(scanId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const scan = await this.getScanByIdOrThrow(adminClient, scanId);
    await this.runScanProcessing(adminClient, scan);
  }

  private async getScanOrThrow(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    userId: string,
    scanId: string,
  ): Promise<ScanRow> {
    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scan.');
    }

    if (!data) {
      throw new NotFoundException('Scan not found.');
    }

    return data as ScanRow;
  }

  private async getScanByIdOrThrow(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scanId: string,
  ): Promise<ScanRow> {
    const { data, error } = await adminClient
      .from(this.scansTable)
      .select('*')
      .eq('id', scanId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch scan.');
    }

    if (!data) {
      throw new NotFoundException('Scan not found.');
    }

    return data as ScanRow;
  }

  private async updateScan(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scanId: string,
    updates: Record<string, unknown>,
  ) {
    const { error } = await adminClient
      .from(this.scansTable)
      .update(updates)
      .eq('id', scanId);

    if (error) {
      throw new ServiceUnavailableException('Failed to update scan.');
    }
  }

  private async runScanProcessing(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: ScanRow,
  ) {
    try {
      if (!['queued', 'awaiting_upload', 'processing'].includes(scan.status)) {
        this.logger.warn(`Skipping scan ${scan.id} because it is already ${scan.status}.`);
        return;
      }

      await this.updateScan(adminClient, scan.id, {
        status: 'processing',
        updated_at: new Date().toISOString(),
      });

      const startedAt = Date.now();
      const fileBuffer = await this.downloadScanAsset(adminClient, scan);
      const analysisTimestamp = new Date().toISOString();
      const resultPayload = await this.buildAnalysisResultPayload(
        scan,
        fileBuffer,
        analysisTimestamp,
        startedAt,
      );

      await this.updateScan(adminClient, scan.id, {
        status: 'complete',
        result_payload: resultPayload,
        failure_reason: null,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error.';
      await this.updateScan(adminClient, scan.id, {
        status: 'failed',
        failure_reason: reason,
        updated_at: new Date().toISOString(),
      });
    }
  }

  private async downloadScanAsset(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    scan: ScanRow,
  ) {
    const { data, error } = await adminClient.storage
      .from(scan.storage_bucket)
      .download(scan.storage_path);

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to download the uploaded asset.');
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async buildAnalysisResultPayload(
    scan: ScanRow,
    fileBuffer: Buffer,
    analysisTimestamp: string,
    startedAt: number,
  ) {
    const metadata = await this.extractMetadata(fileBuffer);
    const imageStats = await this.analyzeImage(fileBuffer);
    const detectedFormat = detectImageFormat(fileBuffer);
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const md5 = createHash('md5').update(fileBuffer).digest('hex');
    const hasHeaderMismatch =
      Boolean(detectedFormat.mimeType) && detectedFormat.mimeType !== scan.mime_type;
    const hasC2paMarker = containsC2paMarker(fileBuffer);
    const metadataSignal = buildMetadataSignal(metadata);
    const imageSignal = buildImageSignal(imageStats);
    const integritySignal = buildIntegritySignal({
      detectedFormatLabel: detectedFormat.label,
      hasHeaderMismatch,
      expectedMimeType: scan.mime_type,
      detectedMimeType: detectedFormat.mimeType,
      sha256,
      md5,
    });
    const provenanceSignal = buildProvenanceSignal(hasC2paMarker);
    const signals = [
      integritySignal,
      metadataSignal,
      imageSignal,
      provenanceSignal,
    ];
    const verdict = buildVerdict({
      metadata,
      imageStats,
      hasHeaderMismatch,
      hasC2paMarker,
      signalCount: signals.length,
    });
    const processingTimeMs = Date.now() - startedAt;
    const primaryOrigin = getPrimaryOrigin(
      this.configService.get<string>('FRONTEND_ORIGIN') ?? '',
    );
    const reportId = `PRV-${scan.id.slice(0, 8).toUpperCase()}`;

    return {
      scan_id: scan.id,
      organization_id: null,
      user_id: scan.user_id,
      media: {
        original_filename: scan.original_filename,
        filename: scan.original_filename,
        media_type: 'image',
        mime_type: scan.mime_type,
        file_size_bytes: scan.file_size_bytes,
        file_hash_sha256: sha256,
        file_hash_md5: md5,
        sha256,
        md5,
        width: imageStats?.width ?? null,
        height: imageStats?.height ?? null,
        duration_seconds: null,
        is_ephemeral: false,
      },
      verdict,
      signals: signals.map((signal) => ({
        ...signal,
        analysis_timestamp: analysisTimestamp,
        processing_time_ms: processingTimeMs,
      })),
      methodology: {
        version: '0.2.0-mvp',
        release_date: '2026-07-07',
        analysis_timestamp: analysisTimestamp,
        environment: 'image-first-mvp',
        node_id: null,
      },
      report: {
        report_id: reportId,
        report_url: primaryOrigin ? `${primaryOrigin}/app/reports/${scan.id}/print` : null,
        share_url: null,
        generated_at: analysisTimestamp,
      },
      metadata: {
        capture_timestamp: metadata.captureTimestamp,
        software: metadata.software,
        make: metadata.make,
        model: metadata.model,
        color_space: metadata.colorSpace,
        orientation: metadata.orientation,
        detected_format: detectedFormat.label,
        header_matches_mime: !hasHeaderMismatch,
        c2pa_marker_detected: hasC2paMarker,
        scan_created_at: scan.created_at,
        scan_completed_at: analysisTimestamp,
        total_processing_time_ms: processingTimeMs,
        processing_cost_credits: null,
        recommendations: buildRecommendations(verdict.class, hasC2paMarker),
      },
    };
  }

  private async extractMetadata(fileBuffer: Buffer) {
    try {
      const parsed = await exifr.parse(fileBuffer, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: true,
        icc: true,
      });

      return {
        captureTimestamp: formatMetadataTimestamp(
          parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? null,
        ),
        software: asNullableString(parsed?.Software),
        make: asNullableString(parsed?.Make),
        model: asNullableString(parsed?.Model),
        orientation: asNullableString(parsed?.Orientation),
        colorSpace: asNullableString(parsed?.ColorSpace),
      };
    } catch {
      return {
        captureTimestamp: null,
        software: null,
        make: null,
        model: null,
        orientation: null,
        colorSpace: null,
      };
    }
  }

  private async analyzeImage(fileBuffer: Buffer): Promise<ImageStats | null> {
    try {
      const image = await Jimp.read(fileBuffer);
      const { width, height, data } = image.bitmap;
      const histogram = new Array<number>(256).fill(0);
      const totalPixels = width * height;
      const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / 120_000)));
      let samples = 0;
      let luminanceSum = 0;
      let luminanceSqSum = 0;
      let saturationSum = 0;
      let edgeCount = 0;
      let edgeSamples = 0;
      let blockBoundaryDifference = 0;
      let blockBoundarySamples = 0;
      let interiorDifference = 0;
      let interiorSamples = 0;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const red = data[index] ?? 0;
          const green = data[index + 1] ?? 0;
          const blue = data[index + 2] ?? 0;
          const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
          const histogramIndex = Math.max(0, Math.min(255, Math.round(luminance)));

          histogram[histogramIndex] += 1;
          samples += 1;
          luminanceSum += luminance;
          luminanceSqSum += luminance * luminance;
          saturationSum += calculateSaturation(red, green, blue);

          if (x + step < width) {
            const rightIndex = (y * width + (x + step)) * 4;
            const rightLuminance =
              0.299 * (data[rightIndex] ?? 0) +
              0.587 * (data[rightIndex + 1] ?? 0) +
              0.114 * (data[rightIndex + 2] ?? 0);
            const delta = Math.abs(luminance - rightLuminance);

            edgeSamples += 1;

            if (delta > 42) {
              edgeCount += 1;
            }

            if (((x + step) / step) % 8 === 0) {
              blockBoundaryDifference += delta;
              blockBoundarySamples += 1;
            } else {
              interiorDifference += delta;
              interiorSamples += 1;
            }
          }
        }
      }

      const luminanceMean = samples > 0 ? luminanceSum / samples : 0;
      const luminanceVariance =
        samples > 0 ? luminanceSqSum / samples - luminanceMean * luminanceMean : 0;
      const entropy = histogram.reduce((total, count) => {
        if (!count || samples === 0) {
          return total;
        }

        const probability = count / samples;
        return total - probability * Math.log2(probability);
      }, 0);
      const blockinessBase =
        blockBoundarySamples > 0 ? blockBoundaryDifference / blockBoundarySamples : 0;
      const blockinessInterior =
        interiorSamples > 0 ? interiorDifference / interiorSamples : 0;

      return {
        width,
        height,
        averageLuminance: roundMetric(luminanceMean),
        luminanceStdDev: roundMetric(Math.sqrt(Math.max(luminanceVariance, 0))),
        saturationMean: roundMetric(samples > 0 ? saturationSum / samples : 0),
        edgeDensity: roundMetric(edgeSamples > 0 ? edgeCount / edgeSamples : 0),
        entropy: roundMetric(entropy),
        blockiness: roundMetric(
          clamp(blockinessBase > 0 ? (blockinessBase - blockinessInterior) / 255 : 0, 0, 1),
        ),
      };
    } catch {
      return null;
    }
  }
}

function sanitizeFilename(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return 'upload';

  const normalized = trimmed.replace(/[^\w.-]+/g, '-').slice(0, 80);

  return normalized || 'upload';
}

function buildIntegritySignal(input: {
  detectedFormatLabel: string;
  hasHeaderMismatch: boolean;
  expectedMimeType: string;
  detectedMimeType: string | null;
  sha256: string;
  md5: string;
}) {
  return {
    signal_id: randomUUID(),
    signal_name: 'file_integrity',
    signal_display_name: 'File Integrity',
    signal_category: 'integrity',
    methodology_version: '0.2.0-mvp',
    model_id: 'integrity-heuristics',
    model_version: '2026-07-07',
    status: input.hasHeaderMismatch ? 'warning' : 'clear',
    status_reason: input.hasHeaderMismatch
      ? `Uploaded MIME type ${input.expectedMimeType} does not match detected file header ${input.detectedMimeType ?? input.detectedFormatLabel}.`
      : `File header matches the declared ${input.expectedMimeType} upload type.`,
    score: input.hasHeaderMismatch ? 0.78 : 0.14,
    confidence: {
      score: 0.84,
      level: 'moderate',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'fingerprint',
        severity: input.hasHeaderMismatch ? 'medium' : 'informational',
        label: 'File fingerprints recorded',
        description: `SHA-256 ${input.sha256.slice(0, 16)}… and MD5 ${input.md5.slice(0, 12)}… captured for audit traceability.`,
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.24,
  };
}

function buildMetadataSignal(metadata: {
  captureTimestamp: string | null;
  software: string | null;
  make: string | null;
  model: string | null;
  orientation: string | null;
  colorSpace: string | null;
}) {
  const editorHeavy =
    Boolean(metadata.software) && !metadata.make && !metadata.model;

  return {
    signal_id: randomUUID(),
    signal_name: 'metadata_forensics',
    signal_display_name: 'Metadata Forensics',
    signal_category: 'metadata',
    methodology_version: '0.2.0-mvp',
    model_id: 'metadata-parser',
    model_version: '2026-07-07',
    status: editorHeavy ? 'warning' : metadata.captureTimestamp ? 'clear' : 'limited',
    status_reason: editorHeavy
      ? 'Metadata shows software-edit traces without capture-device details.'
      : metadata.captureTimestamp
        ? 'Capture metadata is present and consistent enough for audit review.'
        : 'Capture metadata is limited or absent. That is common after export or platform reprocessing.',
    score: editorHeavy ? 0.61 : metadata.captureTimestamp ? 0.2 : 0.38,
    confidence: {
      score: 0.74,
      level: 'moderate',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'metadata_summary',
        severity: editorHeavy ? 'medium' : 'informational',
        label: 'Capture metadata review',
        description: metadata.captureTimestamp
          ? `Capture timestamp ${metadata.captureTimestamp}${metadata.software ? `, software ${metadata.software}` : ''}.`
          : metadata.software
            ? `Software tag ${metadata.software} detected, but capture timestamp is unavailable.`
            : 'No strong capture metadata was preserved in the uploaded file.',
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.2,
  };
}

function buildImageSignal(imageStats: ImageStats | null) {
  const lowTexture =
    imageStats !== null && imageStats.edgeDensity < 0.055 && imageStats.entropy < 6;
  const strongBlockiness = imageStats !== null && imageStats.blockiness > 0.16;
  const status = strongBlockiness ? 'warning' : imageStats ? 'clear' : 'limited';

  return {
    signal_id: randomUUID(),
    signal_name: 'visual_statistics',
    signal_display_name: 'Visual Statistics',
    signal_category: 'image_analysis',
    methodology_version: '0.2.0-mvp',
    model_id: 'visual-heuristics',
    model_version: '2026-07-07',
    status,
    status_reason: imageStats
      ? strongBlockiness
        ? 'Compression boundaries are pronounced enough to merit manual review.'
        : lowTexture
          ? 'Visual texture is relatively smooth, so confidence stays conservative.'
          : 'Image dimensions and texture metrics are available for evidence review.'
      : 'The uploaded image could not be decoded for deeper visual statistics.',
    score: strongBlockiness ? 0.64 : lowTexture ? 0.44 : 0.22,
    confidence: {
      score: imageStats ? 0.69 : 0.34,
      level: imageStats ? 'moderate' : 'limited',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'image_summary',
        severity: strongBlockiness ? 'medium' : 'informational',
        label: 'Texture and compression profile',
        description: imageStats
          ? `Entropy ${imageStats.entropy}, edge density ${imageStats.edgeDensity}, blockiness ${imageStats.blockiness}.`
          : 'Image statistics are unavailable for this file.',
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.34,
  };
}

function buildProvenanceSignal(hasC2paMarker: boolean) {
  return {
    signal_id: randomUUID(),
    signal_name: 'provenance_credentials',
    signal_display_name: 'Provenance Credentials',
    signal_category: 'provenance',
    methodology_version: '0.2.0-mvp',
    model_id: 'c2pa-marker-check',
    model_version: '2026-07-07',
    status: hasC2paMarker ? 'clear' : 'limited',
    status_reason: hasC2paMarker
      ? 'A possible C2PA or content-credential marker was detected in the uploaded asset.'
      : 'No C2PA marker was detected. Absence does not imply manipulation.',
    score: hasC2paMarker ? 0.08 : 0.36,
    confidence: {
      score: 0.58,
      level: 'moderate',
      threshold_applied: 0.5,
    },
    findings: [
      {
        finding_id: randomUUID(),
        finding_type: 'provenance',
        severity: hasC2paMarker ? 'informational' : 'low',
        label: hasC2paMarker
          ? 'Possible provenance marker detected'
          : 'No provenance credential marker detected',
        description: hasC2paMarker
          ? 'The uploaded file contains a marker consistent with embedded provenance metadata.'
          : 'The file does not expose an obvious provenance credential marker in its byte stream.',
        technical_detail: null,
        raw_value: null,
        reference_range: null,
      },
    ],
    supplementary_data: null,
    signal_weight: 0.12,
  };
}

function buildVerdict(input: {
  metadata: {
    captureTimestamp: string | null;
    software: string | null;
    make: string | null;
    model: string | null;
  };
  imageStats: ImageStats | null;
  hasHeaderMismatch: boolean;
  hasC2paMarker: boolean;
  signalCount: number;
}) {
  let suspicionScore = 0.18;

  if (input.hasHeaderMismatch) {
    suspicionScore += 0.34;
  }

  if (input.metadata.software && !input.metadata.make && !input.metadata.model) {
    suspicionScore += 0.12;
  }

  if (!input.metadata.captureTimestamp) {
    suspicionScore += 0.05;
  }

  if (input.imageStats && input.imageStats.blockiness > 0.16) {
    suspicionScore += 0.12;
  }

  if (
    input.imageStats &&
    input.imageStats.edgeDensity < 0.055 &&
    input.imageStats.entropy < 6
  ) {
    suspicionScore += 0.1;
  }

  if (input.hasC2paMarker) {
    suspicionScore -= 0.08;
  }

  suspicionScore = clamp(suspicionScore, 0.05, 0.9);
  const confidenceScore = clamp(0.52 + input.signalCount * 0.045, 0.52, 0.78);

  if (suspicionScore < 0.2) {
    return {
      class: 'likely_authentic',
      display_label: 'Likely Authentic',
      display_color: '#0f766e',
      confidence_score: confidenceScore,
      confidence_level: 'moderate',
      signal_count_total: input.signalCount,
      signal_count_completed: input.signalCount,
      primary_contributing_signals: ['file_integrity', 'provenance_credentials'],
      plain_language_summary:
        'File integrity checks are stable and no strong anomaly cluster was detected. The result still benefits from human review before any high-stakes decision.',
    };
  }

  if (suspicionScore < 0.45) {
    return {
      class: 'inconclusive',
      display_label: 'Inconclusive',
      display_color: '#6b6b6b',
      confidence_score: confidenceScore,
      confidence_level: 'moderate',
      signal_count_total: input.signalCount,
      signal_count_completed: input.signalCount,
      primary_contributing_signals: ['metadata_forensics', 'visual_statistics'],
      plain_language_summary:
        'The file produced a usable evidence package, but the signal mix is not strong enough to support a confident authenticity or synthetic-media verdict.',
    };
  }

  return {
    class: 'suspicious',
    display_label: 'Suspicious',
    display_color: '#b45309',
    confidence_score: confidenceScore,
    confidence_level: 'moderate',
    signal_count_total: input.signalCount,
    signal_count_completed: input.signalCount,
    primary_contributing_signals: ['file_integrity', 'metadata_forensics', 'visual_statistics'],
    plain_language_summary:
      'The evidence package contains enough anomalous signals to recommend manual review before the media is treated as trustworthy.',
  };
}

function buildRecommendations(verdictClass: string, hasC2paMarker: boolean) {
  const recommendations = [
    'Preserve the original uploaded file and its SHA-256 fingerprint for audit traceability.',
    'Use the printable report view when sharing this case with internal reviewers.',
  ];

  if (!hasC2paMarker) {
    recommendations.push('Request source provenance or original capture files when available.');
  }

  if (verdictClass === 'suspicious') {
    recommendations.push('Escalate to manual review before relying on this media in a trust-critical workflow.');
  }

  return recommendations;
}

function detectImageFormat(fileBuffer: Buffer) {
  if (fileBuffer.length >= 3 && fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8) {
    return { label: 'JPEG', mimeType: 'image/jpeg' };
  }

  if (
    fileBuffer.length >= 8 &&
    fileBuffer[0] === 0x89 &&
    fileBuffer[1] === 0x50 &&
    fileBuffer[2] === 0x4e &&
    fileBuffer[3] === 0x47
  ) {
    return { label: 'PNG', mimeType: 'image/png' };
  }

  if (fileBuffer.length >= 6 && fileBuffer.toString('ascii', 0, 6).startsWith('GIF8')) {
    return { label: 'GIF', mimeType: 'image/gif' };
  }

  if (
    fileBuffer.length >= 12 &&
    fileBuffer.toString('ascii', 0, 4) === 'RIFF' &&
    fileBuffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { label: 'WEBP', mimeType: 'image/webp' };
  }

  return { label: 'Unknown', mimeType: null };
}

function containsC2paMarker(fileBuffer: Buffer) {
  const slice = fileBuffer.subarray(0, Math.min(fileBuffer.length, 512_000));
  const haystack = slice.toString('latin1').toLowerCase();
  return haystack.includes('c2pa');
}

function calculateSaturation(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  if (max === 0) {
    return 0;
  }

  return (max - min) / max;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMetric(value: number) {
  return Math.round(value * 1000) / 1000;
}

function asNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue ? stringValue : null;
}

function formatMetadataTimestamp(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? value : timestamp.toISOString();
  }

  return null;
}

function getPrimaryOrigin(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)[0] || null;
}

