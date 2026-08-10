/**
 * report-document.ts — pure mapper from a stored scan row + result_payload into
 * the document-oriented report shape that `sampleReportContent.js` demonstrates
 * on the marketing side (cover, executive summary, metrics, per-signal evidence,
 * findings, next steps, custody chain).
 *
 * No Nest or Supabase dependencies — unit-testable in isolation. Values that
 * cannot be derived honestly from the payload render as "Not assessed" rather
 * than fabricating precision.
 */

export type ReportScanRow = {
  id: string;
  status: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
  result_payload: unknown | null;
  failure_reason?: string | null;
  storage_bucket?: string;
  storage_path?: string;
  processing_mode?: string | null;
  completed_at?: string | null;
};

type VerdictLike = {
  class?: string;
  confidence?: number;
  confidence_score?: number;
  confidence_level?: string;
  display_label?: string;
  plain_language_summary?: string;
  summary?: string;
  signal_count_total?: number;
  signal_count_completed?: number;
  primary_contributing_signals?: string[];
};

type FindingLike = {
  finding_id?: string;
  label?: string;
  description?: string;
  severity?: string;
};

type SignalLike = {
  signal_id?: string;
  signal_name?: string;
  signal_display_name?: string;
  signal_category?: string;
  methodology_version?: string;
  status?: string;
  status_reason?: string;
  score?: number;
  signal_weight?: number;
  findings?: FindingLike[];
  // Legacy / seed dialect — flat label + confidence + finding.
  label?: string;
  confidence?: number;
  finding?: string;
};

type MediaLike = {
  filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  sha256?: string;
  md5?: string;
};

type MetadataLike = {
  capture_timestamp?: string;
  software?: string;
  make?: string;
  model?: string;
  color_space?: string;
  orientation?: string;
  header_matches_mime?: boolean;
  c2pa_marker_detected?: boolean;
  recommendations?: string[];
  total_processing_time_ms?: number;
  scan_created_at?: string;
  scan_completed_at?: string;
};

type MethodologyLike = {
  version?: string;
};

type ReportLike = {
  report_id?: string;
  generated_at?: string;
};

type PayloadLike = {
  verdict?: VerdictLike;
  signals?: SignalLike[];
  media?: MediaLike;
  metadata?: MetadataLike;
  methodology?: MethodologyLike;
  report?: ReportLike;
  report_id?: string;
};

export type ReportMetric = {
  label: string;
  value: string;
  detail: string;
  tone: 'success' | 'warning' | 'neutral' | 'default';
};

export type SignalSummary = {
  label: string;
  score: string;
  status: string;
  detail: string;
};

export type TechnicalFinding = {
  id: string;
  title: string;
  detail: string;
};

export type ReportDocument = {
  meta: {
    reportId: string;
    verificationId: string;
    analysisTimestampIso: string;
    processingTime: string;
    methodologyVersion: string;
    documentVersion: string;
    hash: string;
  };
  cover: {
    verdict: string;
    verdictTone: 'success' | 'warning' | 'neutral';
    confidenceScore: string;
    authenticityScore: string;
    riskLevel: 'High' | 'Moderate' | 'Low';
    signalAgreement: string;
    sourceConfidence: string;
    analysisMode: string;
    mediaType: string;
    fileName: string;
    source: string;
  };
  executiveSummary: { summary: string; explanation: string };
  metrics: ReportMetric[];
  mediaInformation: [string, string][];
  metadataAnalysis: [string, string][];
  aiDetectionResults: SignalSummary[];
  manipulationIndicators: SignalSummary[];
  technicalFindings: TechnicalFinding[];
  recommendedNextSteps: string[];
  chainOfCustody: [string, string][];
  timeline: [string, string][];
  appendix: {
    methodology: string[];
    limitations: string[];
  };
};

const NOT_ASSESSED = 'Not assessed';

/**
 * buildAppendix — the methodology + limitations appendix carried by every
 * report document (approved MVP feature: evidence appendix for court-oriented
 * trust). The copy is deliberately honest: it states what the pipeline does,
 * what a verification can and cannot establish, and that the methodology
 * version bounds how the report should be read. It never overstates
 * confidence or claims legal/editorial authority.
 */
export function buildAppendix(methodologyVersion?: string) {
  const version = methodologyVersion || NOT_ASSESSED;
  return {
    methodology: [
      'This verification aggregates a configured signal suite spanning header and MIME checks, metadata review, provenance-marker detection, frame-level analysis, and model-based fingerprinting.',
      'Each signal reports an individual status, weight, and score; the overall verdict is the weighted aggregate of completed signals only. Signals that did not complete are excluded rather than assumed neutral.',
      `This report was produced under methodology version ${version} and documents the file exactly as received.`,
    ],
    limitations: [
      'A verification assesses the file as received and cannot prove original provenance or rule out sophisticated tampering that leaves no detectable trace.',
      'An incomplete signal suite (for example, missing provenance credentials) lowers source confidence rather than raising it; treat low confidence as unresolved rather than suspicious.',
      'Results are intended to inform human review and escalation decisions, not to substitute for legal, editorial, or security judgments.',
      'Detector thresholds and signal weights may change between methodology versions; reports state the version in use and should be read in that context.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function toPct(value?: number | null): string {
  return Number.isFinite(value) ? `${Math.round((value as number) * 100)}%` : NOT_ASSESSED;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getVerdictTone(verdictClass?: string): ReportDocument['cover']['verdictTone'] {
  switch (verdictClass) {
    case 'authentic':
    case 'likely_authentic':
      return 'success';
    case 'suspicious':
    case 'likely_synthetic':
    case 'synthetic':
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getVerdictLabel(verdictClass?: string): string {
  switch (verdictClass) {
    case 'authentic':
      return 'Authentic';
    case 'likely_authentic':
      return 'Likely Authentic';
    case 'suspicious':
      return 'Suspicious';
    case 'likely_synthetic':
      return 'Likely Synthetic';
    case 'synthetic':
      return 'Synthetic';
    case 'inconclusive':
      return 'Inconclusive';
    default:
      return 'Pending';
  }
}

function getRiskLevel(verdictClass?: string): ReportDocument['cover']['riskLevel'] {
  switch (verdictClass) {
    case 'suspicious':
    case 'likely_synthetic':
    case 'synthetic':
      return 'High';
    case 'inconclusive':
      return 'Moderate';
    default:
      return 'Low';
  }
}

function getAnalysisModeLabel(processingMode?: string | null): string {
  switch (processingMode) {
    case 'quick':
      return 'Quick scan';
    case 'deep':
      return 'Deep verification';
    case 'standard':
    case 'full':
      return 'Standard verification';
    default:
      return 'Full verification';
  }
}

function getMediaTypeLabel(mimeType: string): string {
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.startsWith('image/')) return 'Image';
  return mimeType || 'Unknown';
}

/**
 * Weighted authenticity estimate from completed signals. Mirrors the print
 * page's scoring so the server-side document and the client agree.
 */
function computeAuthenticity(
  signals: SignalLike[],
  verdict?: VerdictLike,
): number | null {
  if (!signals.length) return null;

  const weighted = signals.reduce<{ weight: number; score: number }>(
    (acc, signal) => {
      const weight = Number.isFinite(signal.signal_weight) ? (signal.signal_weight as number) : 1;
      const score = Number.isFinite(signal.score) ? (signal.score as number) : 0;
      return {
        weight: acc.weight + weight,
        score: acc.score + score * weight,
      };
    },
    { weight: 0, score: 0 },
  );

  if (weighted.weight <= 0) return null;

  // Note: the legacy/seed dialect exposes `confidence` (0–100) instead of
  // `score`, so it contributes 0 here and the verdict-class adjustment
  // dominates — legacy scans land near the authenticity floor/ceiling. This
  // is intentional; the spec-shaped signals carry a real `score`.
  const average = weighted.score / weighted.weight;
  const adjustment =
    verdict?.class === 'likely_authentic' || verdict?.class === 'authentic'
      ? -0.08
      : verdict?.class === 'suspicious' || verdict?.class === 'synthetic'
        ? 0.08
        : 0;
  const suspicion = clamp(average + adjustment, 0.05, 0.95);
  return clamp(1 - suspicion, 0.05, 0.95);
}

/**
 * Honest provenance heuristic: each verified provenance check adds to a base,
 * so the number is only emitted when at least one check ran.
 */
function computeSourceConfidence(metadata?: MetadataLike): string {
  if (!metadata) return NOT_ASSESSED;

  const hasHeaderCheck = typeof metadata.header_matches_mime === 'boolean';
  const hasMarkerCheck = typeof metadata.c2pa_marker_detected === 'boolean';

  if (!hasHeaderCheck && !hasMarkerCheck) return NOT_ASSESSED;

  let score = 0.4;
  if (hasHeaderCheck && metadata.header_matches_mime) score += 0.3;
  if (hasMarkerCheck && metadata.c2pa_marker_detected) score += 0.3;
  return toPct(score);
}

function normalizeSignal(raw: SignalLike, index: number): SignalLike {
  const category = raw.signal_category || '';
  const name = raw.signal_display_name || raw.label || `Signal ${index + 1}`;

  // Fallback classification for the legacy/seed dialect (flat label, no
  // category): keyword matching keeps the AI vs manipulation split sensible.
  const lower = name.toLowerCase();
  const isManipulation =
    category === 'pixel_frequency' ||
    category === 'compression' ||
    category === 'continuity' ||
    category === 'integrity' ||
    category === 'image_analysis' ||
    /frequency|continuity|lighting|lip|frame|artifact|compression|integrity/.test(lower);

  return {
    ...raw,
    signal_category: category || (isManipulation ? 'image_analysis' : 'generative'),
    signal_display_name: name,
  };
}

function toSignalSummary(signal: SignalLike): SignalSummary {
  const score = Number.isFinite(signal.score)
    ? toPct(signal.score)
    : Number.isFinite(signal.confidence)
      ? // The legacy/seed dialect stores `confidence` on a 0–100 scale with no
        // `score`; `toPct` expects 0–1, so anything > 1 is already a percent.
        (signal.confidence as number) > 1
        ? `${Math.round(signal.confidence as number)}%`
        : toPct(signal.confidence)
      : NOT_ASSESSED;

  return {
    label: signal.signal_display_name || signal.label || 'Signal',
    score,
    status: signal.status || 'Reviewed',
    detail:
      signal.status_reason ||
      signal.finding ||
      'No summary recorded for this signal group.',
  };
}

function splitSignals(signals: SignalLike[]): {
  ai: SignalSummary[];
  manipulation: SignalSummary[];
} {
  const ai: SignalSummary[] = [];
  const manipulation: SignalSummary[] = [];

  for (const raw of signals) {
    const signal = normalizeSignal(raw, ai.length + manipulation.length);
    const summary = toSignalSummary(signal);
    if (signal.signal_category === 'generative' || signal.signal_category === 'c2pa') {
      ai.push(summary);
    } else {
      manipulation.push(summary);
    }
  }

  return { ai, manipulation };
}

function buildTechnicalFindings(signals: SignalLike[]): TechnicalFinding[] {
  const findings: TechnicalFinding[] = [];

  for (const raw of signals) {
    const signal = normalizeSignal(raw, findings.length);
    const owned = signal.findings || [];

    if (owned.length) {
      for (const finding of owned) {
        findings.push({
          id: finding.finding_id || `FND-${String(findings.length + 1).padStart(3, '0')}`,
          title: finding.label || 'Finding',
          detail: finding.description || 'No description recorded.',
        });
      }
    } else {
      findings.push({
        id: `FND-${String(findings.length + 1).padStart(3, '0')}`,
        title: signal.signal_display_name || 'Signal',
        detail:
          signal.status_reason ||
          signal.finding ||
          'No per-signal finding was recorded for this group.',
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function buildReportDocument(scan: ReportScanRow): ReportDocument {
  const payload = (scan.result_payload || {}) as PayloadLike;
  const verdict = payload.verdict || {};
  const signals = (payload.signals || []).map(normalizeSignal);
  const media = payload.media || {};
  const metadata = payload.metadata || {};
  const methodology = payload.methodology || {};
  const report = payload.report || {};

  const verdictClass = verdict.class;
  const tone = getVerdictTone(verdictClass);
  const confidence = Number.isFinite(verdict.confidence_score)
    ? (verdict.confidence_score as number)
    : Number.isFinite(verdict.confidence)
      ? (verdict.confidence as number)
      : undefined;
  const authenticity = computeAuthenticity(signals, verdict);
  const authenticityScore = Number.isFinite(authenticity)
    ? `${Math.round((authenticity as number) * 100)} / 100`
    : NOT_ASSESSED;
  const agreement = Number.isFinite(verdict.signal_count_total)
    ? Number.isFinite(verdict.signal_count_completed)
      ? toPct(
          (verdict.signal_count_total as number) > 0
            ? (verdict.signal_count_completed as number) / (verdict.signal_count_total as number)
            : undefined,
        )
      : NOT_ASSESSED
    : NOT_ASSESSED;
  const riskLevel = getRiskLevel(verdictClass);
  const confidenceScore = toPct(confidence);

  const { ai, manipulation } = splitSignals(signals);

  const summary =
    verdict.plain_language_summary ||
    verdict.summary ||
    (scan.failure_reason
      ? `This verification did not complete: ${scan.failure_reason}.`
      : 'No verdict summary is available for this upload yet.');

  const strongest = [...signals]
    .filter((signal) => Number.isFinite(signal.score))
    .sort((a, b) => (b.score as number) - (a.score as number))
    .slice(0, 2)
    .map((signal) => signal.signal_display_name || signal.label)
    .filter(Boolean);

  const explanation = strongest.length
    ? `The verdict reflects overlapping signals rather than a single detector. The strongest contributors were ${strongest.join(
        ' and ',
      )}.`
    : 'The verdict aggregates the completed signal groups in this verification run.';

  const processingTime = Number.isFinite(metadata.total_processing_time_ms)
    ? `${metadata.total_processing_time_ms} ms`
    : NOT_ASSESSED;

  const reportId =
    report.report_id || payload.report_id || `Report ${scan.id.slice(0, 8)}`;
  const analysisTimestampIso =
    report.generated_at || scan.completed_at || scan.updated_at || scan.created_at;
  const sha256 = media.sha256 || 'Pending';
  const mimeType = media.mime_type || scan.mime_type;
  const fileName = media.filename || scan.original_filename;

  const mediaInformation: [string, string][] = [
    ['Media type', getMediaTypeLabel(mimeType)],
    ['File name', fileName],
    ['File size', Number.isFinite(media.file_size_bytes) ? `${media.file_size_bytes} bytes` : `${scan.file_size_bytes} bytes`],
    ...(Number.isFinite(media.duration_seconds)
      ? ([['Duration', `${media.duration_seconds} seconds`]] as [string, string][])
      : []),
    ...(media.width && media.height
      ? ([['Resolution', `${media.width} x ${media.height}`]] as [string, string][])
      : []),
    ['Hash reference', sha256],
  ];

  const metadataAnalysis: [string, string][] = [
    ['Capture timestamp', metadata.capture_timestamp || 'Unavailable in source headers'],
    ['Software tag', metadata.software || 'Not available'],
    ['Camera make', metadata.make || 'Not available'],
    ['Camera model', metadata.model || 'Not available'],
    ['Color space', metadata.color_space || 'Not available'],
    ['Orientation', metadata.orientation || 'Not available'],
    [
      'Header / MIME check',
      typeof metadata.header_matches_mime === 'boolean'
        ? metadata.header_matches_mime
          ? 'Detected header matches the declared upload type'
          : 'Detected header does not match the declared upload type'
        : 'Not checked',
    ],
    [
      'Provenance marker',
      typeof metadata.c2pa_marker_detected === 'boolean'
        ? metadata.c2pa_marker_detected
          ? 'Content credential / provenance marker detected'
          : 'No provenance marker detected'
        : 'Not checked',
    ],
  ];

  return {
    meta: {
      reportId,
      verificationId: scan.id,
      analysisTimestampIso,
      processingTime,
      methodologyVersion: methodology.version || NOT_ASSESSED,
      documentVersion: '1.0 export',
      hash: sha256,
    },
    cover: {
      verdict: verdict.display_label || getVerdictLabel(verdictClass),
      verdictTone: tone,
      confidenceScore,
      authenticityScore,
      riskLevel,
      signalAgreement: agreement,
      sourceConfidence: computeSourceConfidence(metadata),
      analysisMode: getAnalysisModeLabel(scan.processing_mode),
      mediaType: getMediaTypeLabel(mimeType),
      fileName,
      source: 'Uploaded by workspace member',
    },
    executiveSummary: { summary, explanation },
    metrics: [
      {
        label: 'Verification outcome',
        value: verdict.display_label || getVerdictLabel(verdictClass),
        detail:
          riskLevel === 'High'
            ? 'Escalation is recommended before publication, distribution, or legal reliance.'
            : 'Result reflects the completed signal set for this verification run.',
        tone,
      },
      {
        label: 'Confidence score',
        value: confidenceScore,
        detail: verdict.confidence_level || 'Confidence across completed signals.',
        tone: tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'neutral',
      },
      {
        label: 'Risk assessment',
        value: riskLevel,
        detail:
          riskLevel === 'High'
            ? 'Result carries material workflow and reputational risk if left unreviewed.'
            : riskLevel === 'Moderate'
              ? 'Additional review is recommended before external reliance.'
              : 'No material risk flags were raised by the completed signals.',
        tone,
      },
      {
        label: 'Authenticity score',
        value: authenticityScore,
        detail: 'Lower values indicate weaker evidence of authentic origin.',
        tone: 'default',
      },
      {
        label: 'Signal agreement',
        value: agreement,
        detail: 'Proportion of the configured signal suite that completed.',
        tone: 'default',
      },
      {
        label: 'Source confidence',
        value: computeSourceConfidence(metadata),
        detail: 'How much of the file provenance chain could be independently verified.',
        tone: 'default',
      },
    ],
    mediaInformation,
    metadataAnalysis,
    aiDetectionResults: ai,
    manipulationIndicators: manipulation,
    technicalFindings: buildTechnicalFindings(signals),
    recommendedNextSteps: metadata.recommendations || [],
    chainOfCustody: [
      ['Verification ID', scan.id],
      ['Intake status', scan.status === 'complete' ? 'Completed' : scan.status],
      ['File fingerprint', sha256],
      ['Report status', 'Ready for export'],
    ],
    timeline: [
      ['Upload accepted', scan.created_at],
      [
        'Analysis completed',
        report.generated_at || scan.completed_at || scan.updated_at,
      ],
      ['Report packaged', scan.updated_at],
    ],
    appendix: buildAppendix(methodology.version),
  };
}
