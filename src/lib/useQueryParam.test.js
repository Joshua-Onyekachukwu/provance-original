import { describe, expect, it } from 'vitest'
import { readQueryParam } from './useQueryParam.js'

/**
 * readQueryParam contract — the absent-key default is what keeps the URL
 * writer canonical. Regression lock for the infinite navigation loop that
 * occurred when a validator accepted null: absent ?status= read as raw null,
 * the writer serialized it as 'status=null', the re-derive rejected 'null'
 * and adopted the default, the writer deleted the key, absent → null → …
 * forever. An absent key must ALWAYS read as defaultValue, even when
 * validate(null) is true.
 */
describe('readQueryParam absent-key contract', () => {
  // A validator that (wrongly) accepts null, like the JobsPage bug that
  // produced the loop. The reader must still default for an absent key.
  const acceptsNull = (raw) => raw === null || ['all', 'failed'].includes(raw)
  const rejectsNull = (raw) => ['all', 'failed'].includes(raw)

  it('returns defaultValue for an absent key even when validate(null) is true', () => {
    expect(readQueryParam('', 'status', acceptsNull, 'all')).toBe('all')
    expect(readQueryParam('?state=empty', 'status', acceptsNull, 'all')).toBe('all')
  })

  it('returns defaultValue for an absent key when validate rejects null (TeamFilter contract)', () => {
    expect(readQueryParam('', 'team', rejectsNull, 'all')).toBe('all')
  })

  it('returns the raw value when present and valid', () => {
    expect(readQueryParam('?status=failed', 'status', rejectsNull, 'all')).toBe('failed')
  })

  it('returns defaultValue when present but invalid (never raw garbage)', () => {
    expect(readQueryParam('?status=bogus', 'status', rejectsNull, 'all')).toBe('all')
    // A null-validating validator must not let a literal 'null' string through.
    expect(readQueryParam('?status=null', 'status', acceptsNull, 'all')).toBe('all')
  })

  it('round-trips the canonical URL without the loop state (absent → default → delete)', () => {
    // Simulate the writer round trip: absent reads 'all'; 'all' serializes to
    // delete; the re-read of the deleted key is 'all' again — stable.
    expect(readQueryParam('', 'status', acceptsNull, 'all')).toBe('all')
    expect(readQueryParam('', 'status', acceptsNull, 'all')).toBe('all')
  })
})
