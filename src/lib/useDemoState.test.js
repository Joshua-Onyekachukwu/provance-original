import { describe, expect, it } from 'vitest'
import { withDemoOverride } from './useDemoState.js'

const READY_RESOURCE = {
  status: 'ready',
  data: [{ id: 1 }],
  error: '',
  reload: () => undefined,
}

describe('withDemoOverride', () => {
  it('returns the resource untouched when no demo state is set', () => {
    expect(withDemoOverride(READY_RESOURCE, null)).toBe(READY_RESOURCE)
    expect(withDemoOverride(READY_RESOURCE, undefined)).toBe(READY_RESOURCE)
  })

  it("forces 'loading' — status flips, data is preserved for skeletons", () => {
    const forced = withDemoOverride(READY_RESOURCE, 'loading')

    expect(forced.status).toBe('loading')
    expect(forced.data).toBe(READY_RESOURCE.data)
    expect(forced.error).toBe('')
  })

  it("forces 'error' with the demo message while keeping data", () => {
    const forced = withDemoOverride(READY_RESOURCE, 'error')

    expect(forced.status).toBe('error')
    expect(forced.error).toBe('Demo state — forced error for review. This is not a real outage.')
    expect(forced.data).toBe(READY_RESOURCE.data)
  })

  it("forces 'empty' — ready status with the supplied emptyData so empty branches trigger", () => {
    const forced = withDemoOverride(READY_RESOURCE, 'empty', { emptyData: [] })

    expect(forced.status).toBe('ready')
    expect(forced.data).toEqual([])
    expect(forced.error).toBe('')
  })

  it('honors a custom emptyData payload', () => {
    const forced = withDemoOverride(READY_RESOURCE, 'empty', {
      emptyData: { profile: null, members: [], teams: [] },
    })

    expect(forced.data).toEqual({ profile: null, members: [], teams: [] })
  })

  it('defaults emptyData to null and never mutates the source resource', () => {
    const forced = withDemoOverride(READY_RESOURCE, 'empty')

    expect(forced.data).toBeNull()
    expect(READY_RESOURCE).toEqual({ status: 'ready', data: [{ id: 1 }], error: '', reload: expect.any(Function) })
  })
})
