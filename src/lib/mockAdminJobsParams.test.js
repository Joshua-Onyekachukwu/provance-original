import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mockGetAdminJobs } from './mockApi.js'
import { mockAdminJobs } from './mockData.js'

/**
 * mockGetAdminJobs params contract — the mock must mirror the real backend
 * GET /admin/jobs envelope ({ data, total, page, pageSize } with exact total
 * after the status filter) so the Jobs page's server-driven table and the
 * full-set worker panel behave identically in mock and real mode.
 */
beforeEach(() => {
  vi.stubGlobal('window', {
    location: { search: '?noisy=0' }, // silence random error injection
    localStorage: { getItem: () => null },
  })
})

const statusCount = (status) => mockAdminJobs.filter((j) => j.status === status).length

describe('mockGetAdminJobs params', () => {
  it('returns the full set with the envelope when called without params', async () => {
    const result = await mockGetAdminJobs()
    expect(result.total).toBe(mockAdminJobs.length)
    expect(result.data).toHaveLength(mockAdminJobs.length)
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(500)
  })

  it('filters by status with an exact total (display dialect, like the backend)', async () => {
    const failed = await mockGetAdminJobs({ status: 'failed' })
    expect(failed.total).toBe(statusCount('failed'))
    expect(failed.data).toHaveLength(statusCount('failed'))
    expect(failed.data.every((j) => j.status === 'failed')).toBe(true)

    const completed = await mockGetAdminJobs({ status: 'completed' })
    expect(completed.total).toBe(statusCount('completed'))
    expect(completed.data.every((j) => j.status === 'completed')).toBe(true)
  })

  it("treats 'all' and absent status identically (no filter)", async () => {
    const all = await mockGetAdminJobs({ status: 'all' })
    expect(all.total).toBe(mockAdminJobs.length)
    expect(all.data).toHaveLength(mockAdminJobs.length)
  })

  it('paginates the filtered set with the exact total preserved across pages', async () => {
    const pageSize = 5
    const page1 = await mockGetAdminJobs({ status: 'completed', page: 1, pageSize })
    const page2 = await mockGetAdminJobs({ status: 'completed', page: 2, pageSize })

    const expected = mockAdminJobs.filter((j) => j.status === 'completed')
    expect(page1.total).toBe(expected.length)
    expect(page1.data).toEqual(expected.slice(0, 5))
    expect(page2.data).toEqual(expected.slice(5, 10))
    expect(page1.page).toBe(1)
    expect(page2.page).toBe(2)
    expect(page1.pageSize).toBe(5)
    // Pages are disjoint and neither repeats a job.
    const ids = new Set([...page1.data, ...page2.data].map((j) => j.id))
    expect(ids.size).toBe(page1.data.length + page2.data.length)
  })

  it('clamps page/pageSize like the backend (page min 1, pageSize max 500)', async () => {
    const clamped = await mockGetAdminJobs({ page: 0, pageSize: 9999 })
    expect(clamped.page).toBe(1)
    expect(clamped.pageSize).toBe(500)
    expect(clamped.data.length).toBeLessThanOrEqual(500)
  })

  it('returns an empty page beyond the filtered range without losing the total', async () => {
    const deep = await mockGetAdminJobs({ status: 'failed', page: 50, pageSize: 5 })
    expect(deep.total).toBe(statusCount('failed'))
    expect(deep.data).toHaveLength(0)
  })
})
