// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { readQueryParam, useQueryParam } from './useQueryParam.js'

// Example validator: a plain uppercase token (like a status filter).
const isUpper = (value) => typeof value === 'string' && /^[A-Z]+$/.test(value)

/** Captures the router location so tests can assert URL writes. */
function LocationProbe({ probe }) {
  const location = useLocation()
  useEffect(() => {
    probe.location = location
  }, [location, probe])
  return null
}

function renderParam(initialEntries, options) {
  const probe = { location: null }
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <LocationProbe probe={probe} />
      {children}
    </MemoryRouter>
  )
  return { ...renderHook(() => useQueryParam(options), { wrapper }), probe }
}

describe('readQueryParam (pure)', () => {
  it('returns the validated raw value', () => {
    expect(readQueryParam('?mode=DEEP', 'mode', isUpper, 'QUICK')).toBe('DEEP')
  })

  it('falls back to the default when absent or invalid', () => {
    expect(readQueryParam('', 'mode', isUpper, 'QUICK')).toBe('QUICK')
    expect(readQueryParam('?mode=deep', 'mode', isUpper, 'QUICK')).toBe('QUICK')
    expect(readQueryParam('?mode=', 'mode', isUpper, 'QUICK')).toBe('QUICK')
    expect(readQueryParam('?other=1&mode=deep', 'mode', isUpper, 'QUICK')).toBe('QUICK')
  })

  it('ignores sibling params when extracting the key', () => {
    expect(readQueryParam('?state=empty&mode=DEEP&team=team_legal', 'mode', isUpper, 'QUICK')).toBe(
      'DEEP',
    )
  })
})

describe('useQueryParam (hook)', () => {
  const options = { key: 'mode', validate: isUpper, defaultValue: 'QUICK' }

  it('initializes from a valid URL value', () => {
    const { result } = renderParam(['/?mode=DEEP'], options)
    expect(result.current[0]).toBe('DEEP')
  })

  it('falls back to the default for an absent or invalid param', () => {
    const absent = renderParam(['/?state=empty'], options)
    expect(absent.result.current[0]).toBe('QUICK')

    const invalid = renderParam(['/?mode=deep'], options)
    expect(invalid.result.current[0]).toBe('QUICK')
  })

  it('writes the value to the URL with replace, preserving sibling params', () => {
    const { result, probe } = renderParam(['/?state=empty&team=team_legal'], options)

    act(() => result.current[1]('DEEP'))

    expect(probe.location.pathname).toBe('/')
    expect(probe.location.search).toContain('mode=DEEP')
    expect(probe.location.search).toContain('state=empty')
    expect(probe.location.search).toContain('team=team_legal')
    // The value round-trips from the URL.
    expect(result.current[0]).toBe('DEEP')
  })

  it('deletes the key when the value returns to the default', () => {
    const { result, probe } = renderParam(['/?mode=DEEP'], options)

    act(() => result.current[1]('QUICK'))

    expect(probe.location.search).not.toContain('mode=')
    expect(result.current[0]).toBe('QUICK')
  })

  it('canonicalizes invalid set values back to the default', () => {
    const { result } = renderParam(['/'], options)

    act(() => result.current[1]('lowercase'))

    expect(result.current[0]).toBe('QUICK')
  })

  it('supports functional updates', () => {
    const { result } = renderParam(['/?mode=FAST'], options)

    act(() => result.current[1]((prev) => (prev === 'FAST' ? 'SLOW' : prev)))

    expect(result.current[0]).toBe('SLOW')
  })

  it('re-derives from the URL when it changes externally (back/forward)', () => {
    // Navigate from outside the hook (simulating back/forward or a manual
    // URL edit) and confirm the value follows the new search string.
    const probe = { location: null }
    let trigger = null
    function NavTrigger() {
      const nav = useNavigate()
      trigger = () => nav('/?mode=SLOW')
      return null
    }
    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/?mode=FAST']}>
        <NavTrigger />
        <LocationProbe probe={probe} />
        {children}
      </MemoryRouter>
    )
    const { result } = renderHook(() => useQueryParam(options), { wrapper })
    expect(result.current[0]).toBe('FAST')

    act(() => trigger())
    expect(result.current[0]).toBe('SLOW')

    // The write effect must NOT fight the external navigation: the URL stays
    // settled on the externally-set value. This pins the origin-ref fix — a
    // naive write-then-re-derive structure ping-pongs between the two URLs
    // (and previously hung this suite).
    expect(probe.location.search).toContain('mode=SLOW')
    act(() => {})
    expect(probe.location.search).toContain('mode=SLOW')
    expect(probe.location.search).not.toContain('mode=FAST')
  })

  it('honors custom read/serialize overrides for a parsed value shape', () => {
    const { result, probe } = renderParam(
      ['/?flags=a,b'],
      {
        key: 'flags',
        validate: (v) => Array.isArray(v),
        defaultValue: [],
        read: (search) => {
          const raw = new URLSearchParams(search).get('flags')
          return raw ? raw.split(',') : []
        },
        serialize: (value) => (value.length ? value.join(',') : null),
      },
    )

    expect(result.current[0]).toEqual(['a', 'b'])

    act(() => result.current[1](['x', 'y']))

    expect(probe.location.search).toContain('flags=x%2Cy')
    expect(result.current[0]).toEqual(['x', 'y'])

    act(() => result.current[1]([]))
    expect(probe.location.search).not.toContain('flags=')
  })
})
