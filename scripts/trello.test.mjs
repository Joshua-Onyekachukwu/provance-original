import { describe, expect, it, vi } from 'vitest'
import {
  TRELLO_API,
  buildCardDesc,
  buildUrl,
  createApi,
  findByName,
  findCardByTitle,
  parseArgs,
  phaseLabel,
  priorityLabel,
  renderSnapshot,
  summarize,
  taxonomyLabels,
  typeLabel,
  validateSpec,
} from './trello.mjs'

describe('label normalization', () => {
  it('normalizes phase references to "Phase: N"', () => {
    expect(phaseLabel('Phase 3')).toBe('Phase: 3')
    expect(phaseLabel('3')).toBe('Phase: 3')
    expect(phaseLabel('Phase: 3')).toBe('Phase: 3')
    expect(phaseLabel(3)).toBe('Phase: 3')
    expect(phaseLabel('Next')).toBeNull()
  })

  it('normalizes the deferred Post-MVP phase bucket', () => {
    expect(phaseLabel('Post-MVP')).toBe('Phase: Post-MVP')
    expect(phaseLabel('Phase: Post-MVP')).toBe('Phase: Post-MVP')
    expect(phaseLabel('post mvp')).toBe('Phase: Post-MVP')
    expect(taxonomyLabels().some((l) => l.name === 'Phase: Post-MVP')).toBe(true)
  })

  it('never collides with numeric phases (e.g. "Post-MVP 3" is invalid)', () => {
    expect(phaseLabel('Post-MVP 3')).toBeNull()
    expect(phaseLabel('Phase: Post-MVP 3')).toBeNull()
  })

  it('normalizes type references to "Type: X" and rejects unknown types', () => {
    expect(typeLabel('Feature')).toBe('Type: Feature')
    expect(typeLabel('Type: Backend')).toBe('Type: Backend')
    expect(typeLabel('Widget')).toBeNull()
  })

  it('normalizes priority references to "Priority: Px" and rejects unknown', () => {
    expect(priorityLabel('P0')).toBe('Priority: P0')
    expect(priorityLabel('Priority: P2')).toBe('Priority: P2')
    expect(priorityLabel('P9')).toBeNull()
  })

  it('covers every taxonomy entry with a Trello-valid color', () => {
    const colors = ['yellow', 'purple', 'blue', 'red', 'green', 'orange', 'black', 'sky', 'pink', 'lime']
    for (const label of taxonomyLabels()) {
      expect(colors).toContain(label.color)
    }
  })
})

describe('buildCardDesc', () => {
  it('builds an acceptance checklist and links sections', () => {
    expect(
      buildCardDesc({
        desc: 'Do the thing.',
        acceptance: ['It works', 'It is fast'],
        links: ['https://github.com/x'],
      }),
    ).toBe(
      'Do the thing.\n\n## Acceptance criteria\n\n- [ ] It works\n- [ ] It is fast\n\n## Links\n\nhttps://github.com/x',
    )
  })

  it('omits empty sections', () => {
    expect(buildCardDesc({})).toBe('')
    expect(buildCardDesc({ desc: 'Only a summary.' })).toBe('Only a summary.')
    expect(buildCardDesc({ acceptance: [] })).toBe('')
    expect(buildCardDesc({ desc: 'x', acceptance: ['a'], links: [] })).toBe(
      'x\n\n## Acceptance criteria\n\n- [ ] a',
    )
  })
})

describe('idempotency matching', () => {
  const cards = [{ name: '  Scan Upload  ' }, { name: 'Queue' }]

  it('matches titles case- and trim-insensitively', () => {
    expect(findCardByTitle(cards, 'scan upload')).toEqual(cards[0])
    expect(findCardByTitle(cards, 'SCAN UPLOAD ')).toEqual(cards[0])
    expect(findCardByTitle(cards, 'nope')).toBeNull()
  })

  it('matches lists and labels by name', () => {
    expect(findByName([{ name: 'Backlog' }], '  backlog ')).toEqual({ name: 'Backlog' })
    expect(findByName([{ name: 'Backlog' }], 'Done')).toBeNull()
  })
})

describe('validateSpec', () => {
  const valid = {
    board: 'Provance',
    lists: ['Backlog', 'In Progress', 'Done'],
    cards: [
      {
        title: 'A card',
        list: 'Backlog',
        phase: 'Phase 3',
        type: 'Feature',
        priority: 'P1',
        acceptance: ['Works'],
      },
    ],
  }

  it('accepts a well-formed spec', () => {
    expect(validateSpec(valid)).toEqual([])
  })

  it('rejects non-objects and missing cards', () => {
    expect(validateSpec(null)).not.toEqual([])
    expect(validateSpec([])).not.toEqual([])
    expect(validateSpec({})).not.toEqual([])
  })

  it('flags malformed extra spec.labels entries', () => {
    expect(validateSpec({ ...valid, labels: [{ color: 'red' }] })).not.toEqual([])
    expect(validateSpec({ ...valid, labels: [{ name: 'Okay', color: 'red' }] })).toEqual([])
    expect(validateSpec({ ...valid, labels: 'not-an-array' })).not.toEqual([])
  })

  it('flags unknown lists, labels, duplicates, and bad acceptance', () => {
    const spec = {
      ...valid,
      cards: [
        { title: 'A card', list: 'Nope' },
        { title: 'x', phase: 'Next' },
        { title: 'x', type: 'Widget' },
        { title: 'y', priority: 'P9' },
        { title: 'y', acceptance: 'not-an-array' },
        { title: 'dupe' },
        { title: 'DUPE' },
      ],
    }
    const errors = validateSpec(spec)
    expect(errors.some((e) => e.includes('unknown list'))).toBe(true)
    expect(errors.some((e) => e.includes('invalid phase'))).toBe(true)
    expect(errors.some((e) => e.includes('unknown type'))).toBe(true)
    expect(errors.some((e) => e.includes('invalid priority'))).toBe(true)
    expect(errors.some((e) => e.includes('acceptance must be an array'))).toBe(true)
    expect(errors.some((e) => e.includes('duplicate title'))).toBe(true)
    expect(errors.some((e) => e.includes('missing title'))).toBe(false)
  })
})

describe('summarize', () => {
  const lists = [
    { id: 'l1', name: 'Backlog' },
    { id: 'l2', name: 'Done' },
  ]
  const labels = [
    { id: 'p3', name: 'Phase: 3' },
    { id: 't1', name: 'Type: Feature' },
    { id: 'pr1', name: 'Priority: P1' },
  ]
  const cards = [
    { id: 'c1', idList: 'l1', idLabels: ['p3', 't1', 'pr1'] },
    { id: 'c2', idList: 'l2', idLabels: [] },
    { id: 'c3', idList: 'l1', idLabels: ['p3'] },
  ]

  it('buckets by list, phase, type, priority, and open state', () => {
    const summary = summarize(cards, lists, labels)
    expect(summary.total).toBe(3)
    expect(summary.open).toBe(2) // only the Done card is closed
    expect(summary.byList).toEqual({ Backlog: 2, Done: 1 })
    expect(summary.byPhase).toEqual({ 'Phase: 3': 2 })
    expect(summary.byType).toEqual({ 'Type: Feature': 1 })
    expect(summary.byPriority).toEqual({ 'Priority: P1': 1 })
  })
})

describe('buildUrl', () => {
  it('appends query params and joins arrays with commas', () => {
    const url = buildUrl('/1/cards', { key: 'k', token: 't', idLabels: ['a', 'b'], pos: 'top' })
    expect(url).toBe(`${TRELLO_API}/1/cards?key=k&token=t&idLabels=a%2Cb&pos=top`)
  })

  it('skips nullish values', () => {
    expect(buildUrl('/1/boards/x', { key: 'k', nothing: undefined, empty: null })).toBe(
      `${TRELLO_API}/1/boards/x?key=k`,
    )
  })
})

describe('parseArgs', () => {
  it('parses commands, positionals, and flags', () => {
    expect(parseArgs(['move', 'Scan Upload', 'Done'])).toEqual({
      command: 'move',
      args: ['Scan Upload', 'Done'],
      flags: {},
    })
    expect(parseArgs(['push', '--spec', 'x.json', '--dry-run'])).toEqual({
      command: 'push',
      args: [],
      flags: { spec: 'x.json', 'dry-run': true },
    })
    expect(parseArgs(['push', '--out=docs/x.md'])).toEqual({
      command: 'push',
      args: [],
      flags: { out: 'docs/x.md' },
    })
  })
})

describe('createApi', () => {
  it('GETs and parses JSON with the auth query params', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'abc' }) })
    const api = createApi({ key: 'k', token: 't', fetchImpl, delayMs: 0 })

    await expect(api.get('/1/boards/b/lists')).resolves.toEqual({ id: 'abc' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toContain('key=k')
    expect(String(url)).toContain('token=t')
    expect(init.method).toBe('GET')
  })

  it('POSTs a JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'x' }) })
    const api = createApi({ key: 'k', token: 't', fetchImpl, delayMs: 0 })

    await api.post('/1/cards', {}, { name: 'Card', idLabels: ['a'] })
    const [, init] = fetchImpl.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ name: 'Card', idLabels: ['a'] })
  })

  it('throws a descriptive error on non-ok responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'invalid key',
    })
    const api = createApi({ key: 'k', token: 't', fetchImpl, delayMs: 0 })

    await expect(api.get('/1/boards/b')).rejects.toThrow(/401/)
    await expect(api.get('/1/boards/b')).rejects.toThrow(/invalid key/)
  })
})

describe('renderSnapshot', () => {
  it('renders lists, cards, labels, and a summary', () => {
    const markdown = renderSnapshot({
      board: { name: 'Provance', shortUrl: 'https://trello.com/b/xyz' },
      lists: [
        { id: 'l1', name: 'Backlog' },
        { id: 'l2', name: 'Done' },
      ],
      cards: [
        {
          id: 'c1',
          idList: 'l1',
          name: 'Scan Upload',
          labels: [{ name: 'Phase: 3' }, { name: 'Priority: P0' }],
          shortUrl: 'https://trello.com/c/abc',
        },
      ],
      labels: [
        { id: 'p3', name: 'Phase: 3' },
        { id: 'pr0', name: 'Priority: P0' },
      ],
    })
    expect(markdown).toContain('# Provance — Trello Board')
    expect(markdown).toContain('https://trello.com/b/xyz')
    expect(markdown).toContain('## Backlog (1)')
    expect(markdown).toContain('**Scan Upload**')
    expect(markdown).toContain('`Phase: 3, Priority: P0`')
    expect(markdown).toContain('## Done (0)')
    expect(markdown).toContain('Total **1** · Open **1**')
  })
})
