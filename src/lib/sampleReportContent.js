export const sampleReportPreviewImage =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=high-trust%20broadcast%20frame%20from%20a%20government%20briefing%2C%20speaker%20at%20lectern%2C%20subtle%20newsroom%20lighting%2C%20realistic%20skin%20texture%2C%20documentary%20style%2C%20sharp%20editorial%20photography%2C%20professional%20forensic%20review%20context&image_size=landscape_16_9'

export const sampleReportMeta = {
  reportId: 'PRV-20260716-041',
  verificationId: 'vrf_a3f8c2d4',
  analysisTimestamp: '2026-07-16 14:32 UTC',
  processingTime: '1.24 seconds',
  methodologyVersion: 'v2.4.1-stable',
  reportEngineVersion: 'report-engine-1.2.0',
  modelCatalogVersion: 'model-catalog-2026.07',
  generatedBy: 'Provance verification pipeline',
  documentVersion: '1.0 sample export',
  hash: 'SHA-256 2b7f91c0b6ccf1ab19f5e37aa4af4d4196bb0d91a1fdb090ed631a6c0e114d91',
}

export const sampleReportCover = {
  verdict: 'Likely Synthetic / Manipulated',
  verdictTone: 'warning',
  confidenceScore: '94.7%',
  authenticityScore: '31 / 100',
  riskLevel: 'High',
  signalAgreement: '61%',
  sourceConfidence: '48%',
  analysisMode: 'Full verification',
  mediaType: 'Video + audio',
  fileName: 'briefing-room-source-clip.mp4',
  owner: 'Editorial standards team',
  source: 'Uploaded by newsroom verification desk',
}

export const sampleExecutiveSummary = {
  summary:
    'Provance identified strong synthetic-media indicators and continuity anomalies in the submitted briefing clip. The result is based on convergent evidence across model-signature matching, frequency-domain analysis, provenance review, and frame-level continuity checks. The current asset should not be treated as a fully reliable source without recovery of the original capture and additional human review.',
  explanation:
    'The verdict reflects overlapping signals rather than a single detector. The strongest contributors were a high-confidence generative fingerprint match, non-natural spectral spikes in facial edge regions, and continuity shifts in the final sequence of frames that were inconsistent with ordinary compression alone.',
}

export const sampleMetrics = [
  {
    label: 'Verification outcome',
    value: 'Manipulated',
    detail: 'Escalation is recommended before publication, distribution, or legal reliance.',
    tone: 'warning',
  },
  {
    label: 'Confidence score',
    value: '94.7%',
    detail: 'High confidence based on convergent evidence.',
    tone: 'warning',
  },
  {
    label: 'Risk assessment',
    value: 'High',
    detail: 'Result carries material workflow and reputational risk if left unreviewed.',
    tone: 'warning',
  },
  {
    label: 'Authenticity score',
    value: '31 / 100',
    detail: 'Lower values indicate weaker evidence of authentic origin.',
    tone: 'default',
  },
  {
    label: 'Signal agreement',
    value: '61%',
    detail: 'Cross-signal agreement is meaningful but not total.',
    tone: 'default',
  },
  {
    label: 'Source confidence',
    value: '48%',
    detail: 'Source history remains only partially verified.',
    tone: 'default',
  },
]

export const sampleMediaInformation = [
  ['Media type', 'Video / MP4'],
  ['Resolution', '1920 x 1080'],
  ['Frame rate', '29.97 fps'],
  ['Duration', '00:00:24'],
  ['Audio track', 'AAC stereo present'],
  ['File size', '44.2 MB'],
  ['Hash reference', sampleReportMeta.hash],
  ['Chain of custody', 'Internal intake case PV-NEWS-1182'],
]

export const sampleMetadataAnalysis = [
  ['Capture timestamp', 'Unavailable in source headers'],
  ['Software tag', 'Export path indicates multi-pass rendering history'],
  ['Camera make', 'Not available'],
  ['Camera model', 'Not available'],
  ['Color space', 'Rec. 709'],
  ['Orientation', 'Landscape'],
  ['Header / MIME check', 'Container and declared MIME are aligned'],
  ['Edit-history confidence', 'Elevated risk due to incomplete provenance chain'],
]

export const sampleAiDetectionResults = [
  {
    label: 'Generative fingerprint analysis',
    score: '96%',
    status: 'High match confidence',
    detail:
      'Pattern behavior aligns most closely with a diffusion-style generation or heavy synthetic compositing pipeline.',
  },
  {
    label: 'Frequency-domain analysis',
    score: '91%',
    status: 'Strong anomaly detection',
    detail:
      'High-frequency spikes and non-natural transitions cluster around facial edges, backdrop gradients, and podium contours.',
  },
  {
    label: 'Compression / texture review',
    score: '74%',
    status: 'Moderate concern',
    detail:
      'Compression artifacts alone do not explain the full anomaly pattern observed across the clip.',
  },
]

export const sampleManipulationIndicators = [
  {
    label: 'Frame continuity',
    score: '88%',
    status: 'Elevated concern',
    detail:
      'Frame-to-frame continuity breaks increase sharply in the final 12 seconds, particularly around face and shoulder regions.',
  },
  {
    label: 'Lighting consistency',
    score: '79%',
    status: 'Material mismatch',
    detail:
      'Shadow behavior and ambient falloff are inconsistent with a stable single-camera briefing-room setup.',
  },
  {
    label: 'Lip-sync / audio alignment',
    score: '67%',
    status: 'Requires review',
    detail:
      'Mouth movement and voiced syllable transitions show mild but notable timing drift.',
  },
]

export const sampleWatermarkAndProvenance = [
  ['C2PA / credentials', 'No content credential marker detected'],
  ['Watermark check', 'No trusted watermark located in the supplied media'],
  ['Source-path comparison', 'Uploaded asset does not fully reconcile with agency copy history'],
  ['Provenance conclusion', 'Origin cannot be independently confirmed from embedded credentials'],
]

export const sampleFrameAnalysis = [
  ['Frame set 01', 'Low anomaly density. Scene establishment appears more natural.'],
  ['Frame set 02', 'Increasing spectral irregularities across backdrop and hairline edges.'],
  ['Frame set 03', 'Continuity break detected during subject head turn and podium movement.'],
  ['Frame set 04', 'Highest anomaly cluster in final segment with edge shimmer and texture collapse.'],
]

export const sampleTimeline = [
  ['00:00', 'Upload accepted and media fingerprint recorded'],
  ['00:08', 'Metadata, provenance, and container checks completed'],
  ['00:17', 'Frame-level, frequency, and signature analysis completed'],
  ['00:24', 'Cross-validation and reviewer summary assembled'],
  ['00:31', 'Export-ready report packaged and stored'],
]

export const sampleModelResults = [
  ['Diffusion-family signature match', '0.93 confidence'],
  ['Temporal inconsistency model', '0.81 confidence'],
  ['Metadata integrity model', '0.72 confidence'],
  ['Watermark / provenance detector', 'No trusted credential found'],
]

export const sampleCrossValidationResults = [
  ['Signal convergence', '4 of 5 primary signal groups support escalation'],
  ['Human-review recommendation', 'Yes, required before external reliance'],
  ['Alternative explanation review', 'Compression alone is insufficient explanation'],
  ['Contradictory evidence', 'Partial source confidence lowers certainty of full origin story'],
]

export const sampleTechnicalFindings = [
  {
    id: 'FRQ-001',
    title: 'Frequency artifacts',
    detail:
      'Non-natural energy distribution detected around face contour and podium-edge regions.',
  },
  {
    id: 'TMP-002',
    title: 'Temporal continuity break',
    detail:
      'Abrupt motion coherence loss appears in the final sequence and does not track with scene motion.',
  },
  {
    id: 'MET-003',
    title: 'Metadata limitation',
    detail:
      'Insufficient original device metadata to confirm first-generation capture history.',
  },
  {
    id: 'PRV-004',
    title: 'Provenance absence',
    detail:
      'No trusted credential or embedded provenance marker was present at analysis time.',
  },
]

export const sampleRecommendedNextSteps = [
  'Request the original first-generation source file and compare it against the reviewed asset.',
  'Confirm origin with the submitting party and reconcile the chain of custody before publication or distribution.',
  'Escalate to editorial, legal, or security review if the clip will be cited externally or used in a decision-making workflow.',
  'Retain this report, file hash, and case reference together to preserve auditability.',
]

export const sampleAnalysisScope = [
  ['Review scope', 'Metadata, provenance, temporal continuity, frame-level artifacts, and model-signature checks'],
  ['Workflow context', 'Editorial review before possible external publication'],
  ['Case owner', 'Standards and verification desk'],
  ['Escalation posture', 'High-priority review with downstream legal and security visibility if needed'],
]

export const sampleReviewerNotes = [
  'The source clip is plausible at casual viewing distance, which is why the evidence summary matters more than a simple verdict label.',
  'The strongest anomalies are clustered rather than universal across the clip, suggesting either heavy synthetic compositing or manipulated sequence replacement.',
  'No trusted provenance credential was available at review time, which materially reduced source confidence.',
]

export const sampleChainOfCustody = [
  ['Intake record', 'PV-NEWS-1182 created by newsroom standards desk'],
  ['Source status', 'Uploaded derivative, original first-generation file not yet received'],
  ['Hash preservation', 'Primary file fingerprint stored with the case and export package'],
  ['Export status', 'Report prepared for PDF circulation and internal escalation'],
]

export const sampleAppendix = [
  ['Appendix A', 'Frame-level anomaly notes and continuity markers'],
  ['Appendix B', 'Signal weighting breakdown and methodology references'],
  ['Appendix C', 'Hash references, file identifiers, and case metadata'],
  ['Appendix D', 'Reviewer notes and escalation record template'],
]

export const sampleDisclaimer =
  'This sample report demonstrates the format and level of detail Provance can generate for high-trust verification workflows. It is not legal advice and should be used alongside appropriate human review, source validation, and organizational policy. Confidence values reflect the current methodology version listed in this report.'
