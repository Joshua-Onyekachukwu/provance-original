/**
 * reportAppendix.js — the methodology + limitations appendix content for the
 * printable report surface and the sample-report demo. It mirrors the backend
 * mapper (backend/src/reports/report-document.ts buildAppendix) so the
 * printable report, the marketing demo, and the server-side PDF all carry the
 * same honest appendix copy. Pure module — unit-testable in isolation.
 *
 * The copy is deliberately honest: it states what the pipeline does, what a
 * verification can and cannot establish, and that the methodology version
 * bounds how the report should be read. It never overstates confidence or
 * claims legal/editorial authority.
 */

export function buildReportAppendix({ methodologyVersion } = {}) {
  const version = methodologyVersion || 'Not assessed'
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
  }
}
