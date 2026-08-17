// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { TONE_CSS_VARS, VERDICT_PALETTE, applyVerdictPalette } from './scanPresentation.js'

// applyVerdictPalette exports the verdict palette (VERDICT_PALETTE in
// scanPresentation.js) as CSS custom properties on <html>, so charts, Badge
// dots, and StatCard accents all consume one source of truth for verdict
// colors. This spec locks the exact vars the DOM receives at boot.
describe('applyVerdictPalette', () => {
  afterEach(() => {
    const root = document.documentElement.style
    for (const key of Object.keys(VERDICT_PALETTE)) {
      root.removeProperty(`--color-verdict-${key}`)
    }
    for (const tone of Object.keys(TONE_CSS_VARS)) {
      root.removeProperty(TONE_CSS_VARS[tone])
    }
  })

  it('writes --color-verdict-{key} for every verdict', () => {
    applyVerdictPalette()
    const root = document.documentElement.style
    for (const [key, p] of Object.entries(VERDICT_PALETTE)) {
      expect(root.getPropertyValue(`--color-verdict-${key}`)).toBe(p.hex)
    }
  })

  it('aliases --color-tone-{tone} to the verdict hex', () => {
    applyVerdictPalette()
    const root = document.documentElement.style
    for (const p of Object.values(VERDICT_PALETTE)) {
      expect(root.getPropertyValue(TONE_CSS_VARS[p.tone])).toBe(p.hex)
    }
  })

  it('is idempotent', () => {
    applyVerdictPalette()
    applyVerdictPalette()
    expect(
      document.documentElement.style.getPropertyValue('--color-verdict-suspicious'),
    ).toBe('#f59e0b')
  })
})
