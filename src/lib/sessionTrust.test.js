import { describe, expect, it } from 'vitest'
import {
  computeNewDeviceFlags,
  isMeaningfulDevice,
  NEW_DEVICE_WINDOW_DAYS,
} from './sessionTrust.js'

const DAY = 86_400_000
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString()

describe('isMeaningfulDevice', () => {
  it('accepts real device labels', () => {
    expect(isMeaningfulDevice('Chrome on Windows')).toBe(true)
    expect(isMeaningfulDevice('  Safari on iPhone ')).toBe(true)
  })

  it('rejects the DB default and empty labels', () => {
    expect(isMeaningfulDevice('Unknown device')).toBe(false)
    expect(isMeaningfulDevice('')).toBe(false)
    expect(isMeaningfulDevice(null)).toBe(false)
    expect(isMeaningfulDevice(undefined)).toBe(false)
  })
})

describe('computeNewDeviceFlags', () => {
  it('badges devices first seen within the window and not older ones', () => {
    const flags = computeNewDeviceFlags([
      { id: 'a', device: 'Chrome on Windows', lastActiveAt: daysAgo(2) }, // recent
      { id: 'b', device: 'Edge on Windows', lastActiveAt: daysAgo(NEW_DEVICE_WINDOW_DAYS + 3) }, // old
    ])
    expect(flags.get('a')).toBe(true)
    expect(flags.get('b')).toBe(false)
  })

  it('never badges rows without a meaningful device', () => {
    const flags = computeNewDeviceFlags([
      { id: 'a', device: 'Unknown device', lastActiveAt: daysAgo(0) },
      { id: 'b', device: '', lastActiveAt: daysAgo(0) },
      { id: 'c', device: null, lastActiveAt: daysAgo(0) },
    ])
    expect(flags.get('a')).toBe(false)
    expect(flags.get('b')).toBe(false)
    expect(flags.get('c')).toBe(false)
  })

  it('governs repeated devices by their FIRST appearance (a device known for weeks stays known)', () => {
    // First appearance 20 days ago → both sessions on that device are known,
    // even though the latest one is fresh.
    const flags = computeNewDeviceFlags([
      { id: 'old', device: 'Chrome on Windows', lastActiveAt: daysAgo(20) },
      { id: 'new', device: 'Chrome on Windows', lastActiveAt: daysAgo(1) },
    ])
    expect(flags.get('old')).toBe(false)
    expect(flags.get('new')).toBe(false)
  })

  it('badges every session on a device whose first appearance is recent', () => {
    const flags = computeNewDeviceFlags([
      { id: 'first', device: 'Firefox on macOS', lastActiveAt: daysAgo(3) },
      { id: 'second', device: 'Firefox on macOS', lastActiveAt: daysAgo(1) },
    ])
    expect(flags.get('first')).toBe(true)
    expect(flags.get('second')).toBe(true)
  })

  it('reads createdAt / created_at when lastActiveAt is absent (backend-view parity)', () => {
    const flags = computeNewDeviceFlags([
      { id: 'a', device: 'Safari on iPhone', createdAt: daysAgo(1) },
      { id: 'b', device: 'Safari on iPhone', created_at: daysAgo(2) },
    ])
    expect(flags.get('a')).toBe(true)
    expect(flags.get('b')).toBe(true)
  })

  it('leaves unparseable timestamps unflagged and tolerates non-arrays', () => {
    const flags = computeNewDeviceFlags([
      { id: 'a', device: 'Chrome on Windows', lastActiveAt: 'not-a-date' },
    ])
    expect(flags.get('a')).toBe(false)
    expect(computeNewDeviceFlags(null)).toEqual(new Map())
    expect(computeNewDeviceFlags(undefined)).toEqual(new Map())
  })
})
