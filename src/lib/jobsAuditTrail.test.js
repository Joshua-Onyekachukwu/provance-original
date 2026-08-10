import { describe, expect, it, afterEach, vi } from 'vitest'
import { mockRetryJob, mockFailJob } from './mockApi.js'
import { mockAdminJobs, mockAuditEvents, AUDIT_SEVERITY_BY_ACTION } from './mockData.js'

/**
 * Mock retry/fail audit-trail parity — the mock mutation layer must mirror
 * what the real backend writes to audit_logs on POST /admin/jobs/:id/retry
 * and /fail: a scan.retried (medium) / scan.failed (high) event attributed to
 * the acting admin, prepended to the newest-first feed that mockGetAuditLogs
 * paginates over.
 */
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

function stubWindow({ email } = {}) {
  vi.stubGlobal('window', {
    location: { search: '?noisy=0' }, // silence random error injection
    localStorage: {
      getItem: (key) =>
        key === AUTH_STORAGE_KEY && email
          ? JSON.stringify({ user: { email } })
          : null,
    },
  })
}

function findJobByStatus(...statuses) {
  const job = mockAdminJobs.find((j) => statuses.includes(j.status))
  if (!job) throw new Error(`No seeded job with status ${statuses.join('/')} — fix the test fixture.`)
  return job
}

describe('mock retry/fail audit trail', () => {
  const originalAuditLength = mockAuditEvents.length
  const touchedJobs = []

  afterEach(() => {
    // Restore the module-level stores so other suites see the pristine mock.
    mockAuditEvents.splice(0, mockAuditEvents.length - originalAuditLength)
    for (const { job, snapshot } of touchedJobs) Object.assign(job, snapshot)
    touchedJobs.length = 0
    vi.unstubAllGlobals()
  })

  function track(job) {
    touchedJobs.push({ job, snapshot: { ...job } })
    return job
  }

  it('writes a scan.retried event (medium) attributed to the session actor', async () => {
    stubWindow({ email: 'founder.admin@provance.local' })
    const job = track(findJobByStatus('failed'))

    const result = await mockRetryJob(job.id)

    expect(result.ok).toBe(true)
    expect(mockAuditEvents).toHaveLength(originalAuditLength + 1)
    const event = mockAuditEvents[0] // prepended → newest first
    expect(event.action).toBe('scan.retried')
    expect(event.severity).toBe(AUDIT_SEVERITY_BY_ACTION['scan.retried']) // 'medium'
    expect(event.severity).toBe('medium')
    expect(event.actor_email).toBe('founder.admin@provance.local')
    expect(event.resource_type).toBe('scan')
    expect(event.resource_id).toBe(job.scan_id)
    expect(event.details).toEqual({ from: 'failed', to: 'queued' })
    expect(new Date(event.created_at).getTime()).not.toBeNaN()
    expect(event.id).toMatch(/^audit_live_\d+_\d+$/)
  })

  it('writes a scan.failed event (high) with the reason, falling back to the admin actor without a session', async () => {
    stubWindow() // no session → fallback actor
    const job = track(findJobByStatus('queued', 'processing'))
    const fromStatus = job.status

    const result = await mockFailJob(job.id, 'Worker hung on frame extraction.')

    expect(result.ok).toBe(true)
    expect(mockAuditEvents).toHaveLength(originalAuditLength + 1)
    const event = mockAuditEvents[0]
    expect(event.action).toBe('scan.failed')
    expect(event.severity).toBe('high') // AUDIT_SEVERITY_BY_ACTION['scan.failed']
    expect(event.actor_email).toBe('joshua.onyekachukwu@provance.io') // mockUsers[0] fallback
    expect(event.resource_id).toBe(job.scan_id)
    expect(event.details).toEqual({
      from: fromStatus,
      to: 'failed',
      reason: 'Worker hung on frame extraction.',
    })
  })

  it('rejects invalid transitions without writing any audit event', async () => {
    stubWindow()
    const completed = track(findJobByStatus('completed'))
    const alreadyFailed = track(findJobByStatus('failed'))

    await expect(mockFailJob(completed.id)).rejects.toThrow('Completed jobs cannot be failed.')
    await expect(mockRetryJob(completed.id)).rejects.toThrow('Only failed jobs can be re-queued.')
    await expect(mockFailJob(alreadyFailed.id)).rejects.toThrow('already failed')

    expect(mockAuditEvents).toHaveLength(originalAuditLength)
  })

  it('prepends multiple live events in newest-first order with unique ids', async () => {
    stubWindow({ email: 'founder.admin@provance.local' })
    const failed = track(findJobByStatus('failed'))
    const queued = track(findJobByStatus('queued', 'processing'))

    await mockRetryJob(failed.id)
    await mockFailJob(queued.id, 'Disk full.')

    expect(mockAuditEvents).toHaveLength(originalAuditLength + 2)
    expect(mockAuditEvents[0].action).toBe('scan.failed')
    expect(mockAuditEvents[1].action).toBe('scan.retried')
    const ids = mockAuditEvents.slice(0, 2).map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })
})
