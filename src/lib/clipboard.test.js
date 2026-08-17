// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText, shareableUrl } from './clipboard.js'

const origin = typeof window !== 'undefined' ? window.location.origin : ''

afterEach(() => {
  vi.restoreAllMocks()
  delete document.execCommand // restore jsdom's native (absent) state
})

describe('shareableUrl', () => {
  it('joins origin, pathname, and search', () => {
    expect(shareableUrl('/app/history', '?team=team_legal&state=empty')).toBe(
      `${origin}/app/history?team=team_legal&state=empty`,
    )
  })

  it('omits the query string when search is empty or undefined', () => {
    expect(shareableUrl('/app', '')).toBe(`${origin}/app`)
    expect(shareableUrl('/app', undefined)).toBe(`${origin}/app`)
  })

  it('normalizes a search string without a leading ?', () => {
    expect(shareableUrl('/app', 'team=team_product')).toBe(`${origin}/app?team=team_product`)
  })

  it('strips excluded keys from the query string', () => {
    expect(
      shareableUrl('/app', '?team=team_legal&state=empty&noisy=0', ['state', 'noisy']),
    ).toBe(`${origin}/app?team=team_legal`)
  })

  it('keeps the query unchanged when nothing is excluded', () => {
    expect(shareableUrl('/app', '?team=team_legal', [])).toBe(`${origin}/app?team=team_legal`)
  })
})

describe('copyText', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await expect(copyText('https://example.test/x')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('https://example.test/x')
  })

  it('falls back when the Clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    // jsdom has no document.execCommand — the guard in copyText must return
    // false without throwing, and still clean up the fallback textarea.
    await expect(copyText('plain text')).resolves.toBe(false)
    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })

  it('falls back when the Clipboard API rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    document.execCommand = vi.fn(() => true)

    await expect(copyText('text')).resolves.toBe(true)
    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })
})
