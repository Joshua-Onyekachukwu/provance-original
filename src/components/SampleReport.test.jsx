// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SampleReport from './SampleReport'
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

/**
 * The landing Sample Report section renders the full branded
 * verification-report document (SampleReportDocument, non-compact), so every
 * content-model export in sampleReportContent.js must appear on the landing.
 * This suite walks the model key-by-key and asserts each one lands in the DOM.
 */
describe('SampleReport (landing section) renders the full report content model', () => {
  // Tolerates a value appearing in more than one section (e.g. the
  // methodology version shows in both the report and the appendix).
  const expectVisible = (text) => {
    expect(screen.getAllByText(text).length, `expected "${text}" in the document`).toBeGreaterThan(0)
  }

  const expectRows = (rows) => {
    for (const [label, value] of rows) {
      expectVisible(label)
      expectVisible(value)
    }
  }

  it('renders the branded cover — ink wordmark, verdict banner, report identity', () => {
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

    // Ink brand band (mirror of the pdfkit cover header)
    expectVisible('Provance')
    expectVisible('Verification report')
    // Verdict banner + headline
    expectVisible('Overall verdict')
    expectVisible(sampleReportCover.verdict)
    // Report identity card
    expectVisible('Report identity')
    expectVisible(sampleReportMeta.reportId)
    expectVisible(sampleReportMeta.verificationId)
    expectVisible(sampleReportMeta.methodologyVersion)
  })

  it('renders the executive summary, media information, metadata, and risk sections', () => {
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

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
    render(
      <MemoryRouter>
        <SampleReport />
      </MemoryRouter>,
    )

    for (const metric of sampleMetrics) {
      expectVisible(metric.label)
      expectVisible(metric.value)
      expectVisible(metric.detail)
    }
  })
})
