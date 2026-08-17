// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SampleReport from './SampleReport'
import SampleReportDocument from './SampleReportDocument'
import { buildReportAppendix } from '../lib/reportAppendix.js'
import {
  sampleAiDetectionResults,
  sampleAnalysisScope,
  sampleAppendix,
  sampleChainOfCustody,
  sampleCrossValidationResults,
  sampleDisclaimer,
  sampleExecutiveSummary,
  sampleFrameAnalysis,
  sampleManipulationIndicators,
  sampleMediaInformation,
  sampleMetadataAnalysis,
  sampleMetrics,
  sampleModelResults,
  sampleRecommendedNextSteps,
  sampleReportCover,
  sampleReportMeta,
  sampleReviewerNotes,
  sampleTechnicalFindings,
  sampleTimeline,
  sampleWatermarkAndProvenance,
} from '../lib/sampleReportContent.js'

// ─────────────────────────────────────────────────────────────────────────
// Landing Sample Report section — the compact teaser. It must show the
// report's headline content (seal, verdict, metrics, key signals) without
// dumping the full document (which lives on /sample-report).
// ─────────────────────────────────────────────────────────────────────────
describe('SampleReport (landing section) — compact verification summary', () => {
  it('renders the circular Verified with Provance seal and the branded ink band', () => {
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Verified with Provance')).toBeInTheDocument()
    expect(screen.getByText('Provance')).toBeInTheDocument()
    expect(screen.getByText('Verification report — sample')).toBeInTheDocument()
  })

  it('shows the verdict headline and the three headline metrics', () => {
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

    expect(screen.getByText('Overall verdict')).toBeInTheDocument()
    expect(screen.getByText(sampleReportCover.verdict)).toBeInTheDocument()
    expect(screen.getByText('Confidence')).toBeInTheDocument()
    expect(screen.getByText(sampleReportCover.confidenceScore)).toBeInTheDocument()
    expect(screen.getByText('Authenticity')).toBeInTheDocument()
    expect(screen.getByText(sampleReportCover.authenticityScore)).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
    expect(screen.getByText(sampleReportCover.riskLevel)).toBeInTheDocument()
  })

  it('shows the key signal rows and the media frame', () => {
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

    expect(screen.getByText('Key signals')).toBeInTheDocument()
    for (const item of sampleAiDetectionResults.slice(0, 3)) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
      expect(screen.getByText(item.score)).toBeInTheDocument()
    }
    expect(screen.getByAltText('Representative frame from the analyzed sample media.')).toBeInTheDocument()
    expect(screen.getByText('Sample media')).toBeInTheDocument()
  })

  it('links through to the full report and stays compact (no deep sections)', () => {
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

    expect(screen.getByText(sampleReportCover.fileName)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /See the full report/ })).toHaveAttribute('href', '/sample-report')
    expect(screen.getByRole('link', { name: /Download Sample PDF/ })).toHaveAttribute('href', '/sample-report/print')
    expect(screen.getByRole('link', { name: /View Full Sample Report/ })).toHaveAttribute('href', '/sample-report')

    // Compact by design — the deep report sections belong to /sample-report.
    for (const sectionLabel of [
      'Media information',
      'Metadata analysis',
      'AI detection results',
      'Technical findings',
      'Recommended next steps',
      'Appendix',
      'Reviewer notes',
      'Disclaimer',
    ]) {
      expect(screen.queryByText(sectionLabel), `"${sectionLabel}" should not render on the landing`).not.toBeInTheDocument()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Full report document (the /sample-report surface) — every content-model
// export in sampleReportContent.js must render here.
// ─────────────────────────────────────────────────────────────────────────
describe('SampleReportDocument renders the full report content model', () => {
  const expectVisible = (text) => {
    expect(screen.getAllByText(text).length, `expected "${text}" in the document`).toBeGreaterThan(0)
  }

  const expectRows = (rows) => {
    for (const [label, value] of rows) {
      expectVisible(label)
      expectVisible(value)
    }
  }

  const renderDocument = () => render(<SampleReportDocument />)

  it('renders the branded cover — ink wordmark, verdict banner, report identity', () => {
    renderDocument()

    expectVisible('Provance')
    expectVisible('Verification report')
    expectVisible('Overall verdict')
    expectVisible(sampleReportCover.verdict)
    expectVisible('Report identity')
    expectVisible(sampleReportMeta.reportId)
    expectVisible(sampleReportMeta.verificationId)
    expectVisible(sampleReportMeta.methodologyVersion)
  })

  it('renders the executive summary, media information, metadata, and risk sections', () => {
    renderDocument()

    expectVisible('Executive summary')
    expectVisible(sampleExecutiveSummary.summary)
    expectVisible(sampleExecutiveSummary.explanation)

    expectVisible('Media information')
    expectRows(sampleMediaInformation)

    expectVisible('Metadata analysis')
    expectRows(sampleMetadataAnalysis)

    expectVisible('Risk assessment')
  })

  it('renders the timeline, version information, and the AI signal sections', () => {
    renderDocument()

    expectVisible('Timeline of analysis')
    for (const [, step] of sampleTimeline) expectVisible(step)

    expectVisible('Version information')
    expectVisible(sampleReportMeta.reportEngineVersion)
    expectVisible(sampleReportMeta.modelCatalogVersion)
    expectVisible(sampleReportMeta.generatedBy)

    expectVisible('AI detection results')
    for (const item of sampleAiDetectionResults) {
      expectVisible(item.label)
      expectVisible(item.score)
    }

    expectVisible('Manipulation indicators')
    for (const item of sampleManipulationIndicators) expectVisible(item.label)
  })

  it('renders provenance, frame analysis, model, cross-validation, and scope sections', () => {
    renderDocument()

    expectVisible('Watermark and provenance checks')
    expectRows(sampleWatermarkAndProvenance)

    expectVisible('Frame analysis')
    expectRows(sampleFrameAnalysis)

    expectVisible('Model results')
    expectRows(sampleModelResults)

    expectVisible('Cross-validation results')
    expectRows(sampleCrossValidationResults)

    expectVisible('Analysis scope')
    expectRows(sampleAnalysisScope)

    expectVisible('Chain of custody and export notes')
    expectRows(sampleChainOfCustody)
  })

  it('renders technical findings, next steps, appendix, reviewer notes, and the disclaimer', () => {
    renderDocument()

    expectVisible('Technical findings')
    for (const item of sampleTechnicalFindings) {
      expectVisible(item.id)
      expectVisible(item.title)
    }

    expectVisible('Recommended next steps')
    for (const item of sampleRecommendedNextSteps) expectVisible(item)

    expectVisible('Appendix')
    expectRows(sampleAppendix)

    expectVisible('Reviewer notes')
    for (const item of sampleReviewerNotes) expectVisible(item)

    const appendix = buildReportAppendix({ methodologyVersion: sampleReportMeta.methodologyVersion })
    expectVisible('Appendix — Methodology')
    expectVisible(appendix.methodology[0])
    expectVisible('Appendix — Limitations')
    expectVisible(appendix.limitations[0])

    expectVisible('Disclaimer')
    expectVisible(sampleDisclaimer)
    expectVisible(sampleReportMeta.documentVersion)
    expectVisible(sampleReportMeta.processingTime)
  })

  it('renders the key metrics grid from the content model', () => {
    renderDocument()

    for (const metric of sampleMetrics) {
      expectVisible(metric.label)
      expectVisible(metric.value)
      expectVisible(metric.detail)
    }
  })
})
