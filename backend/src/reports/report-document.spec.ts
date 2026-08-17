import {
  buildReportDocument,
  getVerdictLabel,
  getVerdictTone,
  type ReportScanRow,
} from './report-document';

const BASE_SCAN: ReportScanRow = {
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
      confidence_level: 'high',
      signal_count_total: 5,
      signal_count_completed: 4,
      primary_contributing_signals: ['generative_fingerprint', 'frequency_domain'],
      plain_language_summary:
        'Model signature detected with anomalous spectral energy in two regions.',
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
        findings: [
          {
            finding_id: 'FRQ-001',
            label: 'Frequency artifacts',
            description: 'Non-natural energy distribution around face contour.',
            severity: 'high',
          },
        ],
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
      {
        signal_id: 'sig-3',
        signal_name: 'metadata_integrity',
        signal_display_name: 'Metadata integrity check',
        signal_category: 'metadata',
        status: 'reviewed',
        status_reason: 'Export path indicates multi-pass rendering history.',
        score: 0.61,
        signal_weight: 0.7,
      },
      {
        signal_id: 'sig-4',
        signal_name: 'c2pa_provenance',
        signal_display_name: 'Provenance credential check',
        signal_category: 'c2pa',
        status: 'reviewed',
        status_reason: 'No trusted content credential marker detected.',
        score: 0.72,
        signal_weight: 0.6,
      },
    ],
    media: {
      filename: 'ceo-statement.mp4',
      mime_type: 'video/mp4',
      file_size_bytes: 64_000_000,
      duration_seconds: 24,
      sha256: 'abc123',
    },
    metadata: {
      header_matches_mime: true,
      c2pa_marker_detected: false,
      recommendations: ['Escalate to editorial review before external distribution.'],
      total_processing_time_ms: 1240,
    },
    methodology: { version: 'v2.4.1-stable' },
    report: { report_id: 'PRV-20260710-005', generated_at: '2026-07-10T09:00:24.000Z' },
  },
};

describe('buildReportDocument', () => {
  it('maps the cover from the verdict with a warning tone for suspicious', () => {
    const doc = buildReportDocument(BASE_SCAN);

    expect(doc.cover.verdict).toBe('Artifacts Detected');
    expect(doc.cover.verdictTone).toBe('warning');
    expect(doc.cover.riskLevel).toBe('High');
    expect(doc.cover.confidenceScore).toBe('88%');
    expect(doc.cover.mediaType).toBe('Video');
    expect(doc.cover.fileName).toBe('ceo-statement.mp4');
    expect(doc.cover.analysisMode).toBe('Standard verification');
  });

  it('derives the authenticity score from weighted signals', () => {
    const doc = buildReportDocument(BASE_SCAN);
    const [value, denominator] = doc.cover.authenticityScore.split(' / ');

    expect(denominator).toBe('100');
    const numeric = Number(value);
    expect(numeric).toBeGreaterThan(0);
    expect(numeric).toBeLessThan(100);
    // A suspicious verdict should land on the low end of the authenticity scale.
    expect(numeric).toBeLessThan(50);
  });

  it('computes signal agreement from completed/total counts', () => {
    const doc = buildReportDocument(BASE_SCAN);
    expect(doc.cover.signalAgreement).toBe('80%');
  });

  it('emits source confidence only when a provenance check ran', () => {
    const doc = buildReportDocument(BASE_SCAN);
    // header_matches_mime = true, c2pa = false → 0.4 + 0.3 = 70%
    expect(doc.cover.sourceConfidence).toBe('70%');

    const noChecks = buildReportDocument({
      ...BASE_SCAN,
      result_payload: { ...(BASE_SCAN.result_payload as object), metadata: {} },
    });
    expect(noChecks.cover.sourceConfidence).toBe('Not assessed');
  });

  it('splits signals into AI detection vs manipulation buckets', () => {
    const doc = buildReportDocument(BASE_SCAN);

    expect(doc.aiDetectionResults.map((s) => s.label)).toEqual([
      'Generative fingerprint analysis',
      'Provenance credential check',
    ]);
    expect(doc.manipulationIndicators.map((s) => s.label)).toEqual([
      'Frame continuity analysis',
      'Metadata integrity check',
    ]);
  });

  it('flattens signal findings into technical findings and falls back per signal', () => {
    const doc = buildReportDocument(BASE_SCAN);

    expect(doc.technicalFindings[0]).toEqual({
      id: 'FRQ-001',
      title: 'Frequency artifacts',
      detail: 'Non-natural energy distribution around face contour.',
    });
    // Signals without findings produce a derived row.
    expect(doc.technicalFindings.some((f) => f.title === 'Frame continuity analysis')).toBe(true);
  });

  it('carries recommendations and custody/timeline rows', () => {
    const doc = buildReportDocument(BASE_SCAN);

    expect(doc.recommendedNextSteps).toEqual([
      'Escalate to editorial review before external distribution.',
    ]);
    expect(doc.chainOfCustody[0]).toEqual(['Verification ID', BASE_SCAN.id]);
    expect(doc.timeline[0][1]).toBe(BASE_SCAN.created_at);
    expect(doc.meta.reportId).toBe('PRV-20260710-005');
    expect(doc.meta.processingTime).toBe('1240 ms');
    expect(doc.meta.methodologyVersion).toBe('v2.4.1-stable');
    expect(doc.meta.hash).toBe('abc123');
  });

  it('carries the evidence appendix with the methodology version interpolated', () => {
    const doc = buildReportDocument(BASE_SCAN);

    expect(doc.appendix.methodology).toHaveLength(3);
    expect(doc.appendix.limitations).toHaveLength(4);
    expect(doc.appendix.methodology[2]).toContain('v2.4.1-stable');
    // Honest framing — the appendix never overstates certainty.
    expect(
      doc.appendix.limitations.some((l) => l.includes('cannot prove original provenance')),
    ).toBe(true);
  });

  it('produces exactly the six sample-report metrics', () => {
    const doc = buildReportDocument(BASE_SCAN);
    expect(doc.metrics).toHaveLength(6);
    expect(doc.metrics[0].label).toBe('Verification outcome');
    expect(doc.metrics[1].value).toBe('88%');
  });
});

describe('buildReportDocument fallbacks', () => {
  const bare = (overrides: Partial<ReportScanRow> = {}): ReportScanRow => ({
    ...BASE_SCAN,
    result_payload: null,
    ...overrides,
  });

  it('handles a null result_payload without throwing', () => {
    const doc = buildReportDocument(bare());

    expect(doc.cover.verdict).toBe('Pending');
    expect(doc.cover.verdictTone).toBe('neutral');
    expect(doc.cover.confidenceScore).toBe('Not assessed');
    expect(doc.cover.authenticityScore).toBe('Not assessed');
    expect(doc.cover.sourceConfidence).toBe('Not assessed');
    expect(doc.aiDetectionResults).toEqual([]);
    expect(doc.manipulationIndicators).toEqual([]);
    expect(doc.metrics).toHaveLength(6);
    // The appendix still ships with a 'Not assessed' methodology version.
    expect(doc.appendix.methodology).toHaveLength(3);
    expect(doc.appendix.methodology[2]).toContain('Not assessed');
    expect(doc.appendix.limitations).toHaveLength(4);
  });

  it('surfaces the failure reason when the scan failed', () => {
    const doc = buildReportDocument(
      bare({
        status: 'failed',
        failure_reason: 'File could not be read after upload',
      }),
    );

    expect(doc.executiveSummary.summary).toContain(
      'File could not be read after upload',
    );
  });

  it('supports the legacy/seed signal dialect (flat label + confidence)', () => {
    const doc = buildReportDocument({
      ...BASE_SCAN,
      result_payload: {
        verdict: { class: 'likely_authentic', confidence: 0.93 },
        signals: [
          { label: 'Model signature scan', confidence: 93, finding: 'None detected' },
          { label: 'Metadata chain', confidence: 93, finding: 'Intact' },
        ],
      },
    });

    expect(doc.cover.verdictTone).toBe('success');
    expect(doc.cover.riskLevel).toBe('Low');
    expect(doc.cover.authenticityScore).not.toBe('Not assessed');
    expect(doc.aiDetectionResults.length + doc.manipulationIndicators.length).toBe(2);
    expect(doc.technicalFindings).toHaveLength(2);

    // Legacy `confidence` is 0–100 — the summary score must render as a
    // percent, not be fed through toPct's 0–1 math (which would give 9300%).
    const scores = [...doc.aiDetectionResults, ...doc.manipulationIndicators].map(
      (s) => s.score,
    );
    expect(scores).toEqual(['93%', '93%']);
  });

  it('derives report id from the scan when no report block exists', () => {
    const doc = buildReportDocument(bare());
    expect(doc.meta.reportId).toBe(`Report ${BASE_SCAN.id.slice(0, 8)}`);
  });
});

describe('verdict vocabulary helpers', () => {
  it('maps every verdict class to a label and tone', () => {
    expect(getVerdictLabel('authentic')).toBe('Authentic');
    expect(getVerdictLabel('likely_authentic')).toBe('Likely Authentic');
    expect(getVerdictLabel('suspicious')).toBe('Suspicious');
    expect(getVerdictLabel('likely_synthetic')).toBe('Likely Synthetic');
    expect(getVerdictLabel('synthetic')).toBe('Synthetic');
    expect(getVerdictLabel('inconclusive')).toBe('Inconclusive');
    expect(getVerdictLabel(undefined)).toBe('Pending');

    expect(getVerdictTone('authentic')).toBe('success');
    expect(getVerdictTone('suspicious')).toBe('warning');
    expect(getVerdictTone('inconclusive')).toBe('neutral');
  });
});
