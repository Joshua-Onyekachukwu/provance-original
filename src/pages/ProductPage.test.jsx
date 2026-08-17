// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductPage from './ProductPage'
import { sampleReportCover } from '../lib/sampleReportContent.js'

describe('ProductPage — report showcase + honest API contract', () => {
  it('shows the compact report summary card (seal, verdict, metrics, key signals)', () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    )

    // The same compact-card visual language as the landing Sample Report:
    // circular seal + ink band + verdict + metrics + key signals.
    expect(screen.getByLabelText('Verified with Provance')).toBeInTheDocument()
    expect(screen.getByText('Provance')).toBeInTheDocument()
    expect(screen.getByText('Overall verdict')).toBeInTheDocument()
    expect(screen.getAllByText(sampleReportCover.verdict).length).toBeGreaterThan(0)
    expect(screen.getByText('Confidence')).toBeInTheDocument()
    expect(screen.getByText('Key signals')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View the Full Sample Report/ })).toHaveAttribute('href', '/sample-report')
  })

  it('documents the real POST /v1/scans contract with no fabricated references', () => {
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    )

    // The real initiate → signed-upload → submit → poll flow.
    expect(screen.getByText('POST /v1/scans')).toBeInTheDocument()
    expect(screen.getByText(/awaiting_upload/)).toBeInTheDocument()
    expect(screen.getByText(/signedUrl/)).toBeInTheDocument()
    expect(screen.getByText(/result_payload/)).toBeInTheDocument()
    expect(screen.getByText(/PRV-20260710-005/)).toBeInTheDocument()

    // Fabricated pre-MVP references must be gone.
    expect(screen.queryByText(/v1\/verify/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ai_generated/)).not.toBeInTheDocument()
    expect(screen.queryByText(/heatmap/)).not.toBeInTheDocument()
    expect(screen.queryByText(/gan_artifact/)).not.toBeInTheDocument()
  })
})
