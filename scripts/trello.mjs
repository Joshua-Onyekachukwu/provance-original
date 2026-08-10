#!/usr/bin/env node
/**
 * trello.mjs — zero-dependency Trello CLI for the Provance workflow.
 *
 * Uses only Node builtins (fetch, fs, path, url). Authentication is via the
 * classic Trello API key + token, passed as query params per the REST API:
 *
 *   TRELLO_API_KEY  — from https://trello.com/power-ups/admin
 *   TRELLO_TOKEN    — generated from that page ("Token" → allow)
 *
 * Commands:
 *   init                 — find or create the board, lists, and labels
 *   push [--spec path]   — upsert cards from a JSON spec (idempotent)
 *   move <card> <list>   — move a card to another list
 *   comment <card> text  — post a comment on a card
 *   snapshot [--out p]   — write docs/trello-board.md
 *   status               — print a list/label distribution summary
 *
 * All commands are idempotent: boards/lists/labels/cards are matched by name
 * and reused rather than duplicated. See docs/trello-workflow.md.
 *
 * The pure helpers below are exported for the vitest spec; the CLI itself
 * only runs when this file is executed directly.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const TRELLO_API = 'https://api.trello.com/1'
export const DEFAULT_LISTS = ['Backlog', 'In Progress', 'Done']
export const PHASE_COLOR = 'sky'
export const TYPE_COLORS = {
  Feature: 'green',
  Fix: 'red',
  Backend: 'blue',
  Frontend: 'purple',
  Docs: 'pink',
  Test: 'lime',
  Design: 'orange',
  Ops: 'black',
  Admin: 'yellow',
}
export const PRIORITY_COLORS = { P0: 'red', P1: 'orange', P2: 'yellow', P3: 'lime' }

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')
const STATE_FILE = path.join(SCRIPT_DIR, '.trello-state.json')
export const DEFAULT_SPEC = path.join(SCRIPT_DIR, 'trello.spec.json')
export const DEFAULT_SNAPSHOT_OUT = path.join(ROOT, 'docs', 'trello-board.md')

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Normalizes a phase reference ('Phase 3' | '3' | 'Phase: 3' | 'Post-MVP')
 * → 'Phase: 3' / 'Phase: Post-MVP'. Post-MVP is the deferred-work bucket from
 * the roadmap's "Post-MVP Expansion Themes".
 */
export function phaseLabel(phase) {
  const suffix = String(phase ?? '').trim().replace(/^phase[:\s]+/i, '')
  if (/^post[- ]?mvp$/i.test(suffix)) return 'Phase: Post-MVP'
  const match = suffix.match(/^(\d+)$/)
  return match ? `Phase: ${match[1]}` : null
}

/** Normalizes a type reference ('Feature' | 'Type: Feature') → 'Type: X'. */
export function typeLabel(type) {
  const value = String(type ?? '').replace(/^Type:\s*/i, '')
  return Object.hasOwn(TYPE_COLORS, value) ? `Type: ${value}` : null
}

/** Normalizes a priority reference ('P1' | 'Priority: P1') → 'Priority: P1'. */
export function priorityLabel(priority) {
  const value = String(priority ?? '').replace(/^Priority:\s*/i, '')
  return Object.hasOwn(PRIORITY_COLORS, value) ? `Priority: ${value}` : null
}

/** Label specs for every phase/type/priority in the taxonomy. */
export function taxonomyLabels() {
  return [
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ name: `Phase: ${n}`, color: PHASE_COLOR })),
    { name: 'Phase: Post-MVP', color: 'black' },
    ...Object.entries(TYPE_COLORS).map(([name, color]) => ({ name: `Type: ${name}`, color })),
    ...Object.entries(PRIORITY_COLORS).map(([name, color]) => ({ name: `Priority: ${name}`, color })),
  ]
}

/**
 * Builds the card description: optional summary, an acceptance-criteria
 * checklist, and a links section. Empty sections are omitted.
 */
export function buildCardDesc({ desc = '', acceptance = [], links = [] } = {}) {
  const parts = []
  if (desc && String(desc).trim()) parts.push(String(desc).trim())
  if (Array.isArray(acceptance) && acceptance.length) {
    parts.push('## Acceptance criteria')
    parts.push(acceptance.map((a) => `- [ ] ${a}`).join('\n'))
  }
  if (Array.isArray(links) && links.length) {
    parts.push('## Links')
    parts.push(links.join('\n'))
  }
  return parts.join('\n\n')
}

/** Case/trim-insensitive exact match on a card title (idempotency guard). */
export function findCardByTitle(cards, title) {
  const target = String(title).trim().toLowerCase()
  return cards.find((card) => String(card.name).trim().toLowerCase() === target) || null
}

/** Case/trim-insensitive name match over lists/labels/boards. */
export function findByName(items, name) {
  const target = String(name).trim().toLowerCase()
  return items.find((item) => String(item.name).trim().toLowerCase() === target) || null
}

/** Returns an array of human-readable spec errors (empty when valid). */
export function validateSpec(spec) {
  const errors = []
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return ['Spec must be an object with a non-empty "cards" array']
  }
  if (!Array.isArray(spec.cards) || spec.cards.length === 0) {
    errors.push('spec.cards must be a non-empty array')
  }
  const lists = new Set((spec.lists || []).map((l) => String(l).toLowerCase()))
  const seen = new Set()
  for (const [index, card] of (spec.cards || []).entries()) {
    const where = `cards[${index}]`
    if (!card || typeof card !== 'object') {
      errors.push(`${where}: must be an object`)
      continue
    }
    const title = String(card.title ?? '').trim()
    if (!title) errors.push(`${where}: missing title`)
    else if (seen.has(title.toLowerCase())) errors.push(`${where}: duplicate title "${title}"`)
    else seen.add(title.toLowerCase())
    if (card.list !== undefined && !lists.has(String(card.list).toLowerCase())) {
      errors.push(`${where}: unknown list "${card.list}" (must be declared in spec.lists)`)
    }
    if (card.phase !== undefined && !phaseLabel(card.phase)) {
      errors.push(`${where}: invalid phase "${card.phase}"`)
    }
    if (card.type !== undefined && !typeLabel(card.type)) {
      errors.push(`${where}: unknown type "${card.type}"`)
    }
    if (card.priority !== undefined && !priorityLabel(card.priority)) {
      errors.push(`${where}: invalid priority "${card.priority}"`)
    }
    if (card.acceptance !== undefined && !Array.isArray(card.acceptance)) {
      errors.push(`${where}: acceptance must be an array of strings`)
    }
  }
  if (spec.labels !== undefined) {
    if (!Array.isArray(spec.labels)) {
      errors.push('spec.labels must be an array of { name, color } objects')
    } else {
      for (const [index, label] of spec.labels.entries()) {
        if (!label || typeof label !== 'object' || typeof label.name !== 'string' || !label.name.trim()) {
          errors.push(`spec.labels[${index}]: missing name`)
        }
      }
    }
  }
  return errors
}

/** Aggregates cards into list/phase/type/priority buckets. */
export function summarize(cards, lists, labels) {
  const listName = new Map(lists.map((l) => [l.id, l.name]))
  const labelNameById = new Map(labels.map((l) => [l.id, l.name]))
  const byList = {}
  const byPhase = {}
  const byType = {}
  const byPriority = {}
  let total = 0
  let open = 0
  for (const card of cards) {
    total += 1
    const list = listName.get(card.idList) || 'Unknown'
    byList[list] = (byList[list] || 0) + 1
    if (list !== 'Done') open += 1
    for (const id of card.idLabels || []) {
      const name = labelNameById.get(id) || ''
      if (name.startsWith('Phase:')) byPhase[name] = (byPhase[name] || 0) + 1
      else if (name.startsWith('Type:')) byType[name] = (byType[name] || 0) + 1
      else if (name.startsWith('Priority:')) byPriority[name] = (byPriority[name] || 0) + 1
    }
  }
  return { byList, byPhase, byType, byPriority, total, open }
}

/** Absolute Trello API URL from a pathname + query (arrays joined with ','). */
export function buildUrl(pathname, query = {}) {
  const url = new URL(`${TRELLO_API}${pathname}`)
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  return url.toString()
}

/** Minimal --flag / --flag=value parser → { command, args, flags }. */
export function parseArgs(argv) {
  const positionals = []
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1)
      } else {
        const next = argv[i + 1]
        if (next !== undefined && !next.startsWith('--')) {
          flags[arg.slice(2)] = next
          i += 1
        } else {
          flags[arg.slice(2)] = true
        }
      }
    } else {
      positionals.push(arg)
    }
  }
  const [command, ...args] = positionals
  return { command, args, flags }
}

// ---------------------------------------------------------------------------
// HTTP layer — throttled fetch wrapper, mockable for tests
// ---------------------------------------------------------------------------

/**
 * Creates the Trello client. `delayMs` throttles requests (~4/s, safely under
 * Trello's per-key limit); pass 0 in tests. `fetchImpl` is injectable.
 */
export function createApi({ key, token, fetchImpl = globalThis.fetch, delayMs = 260 } = {}) {
  let lastCall = 0
  async function request(method, pathname, { query = {}, body } = {}) {
    const url = buildUrl(pathname, { key, token, ...query })
    if (delayMs > 0) {
      const wait = delayMs - (Date.now() - lastCall)
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    }
    lastCall = Date.now()
    const response = await fetchImpl(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(
        `Trello ${method} ${pathname} → ${response.status} ${response.statusText}${text ? `: ${text.slice(0, 200)}` : ''}`,
      )
    }
    if (response.status === 204) return null
    return response.json()
  }
  return {
    get: (pathname, query = {}) => request('GET', pathname, { query }),
    post: (pathname, query = {}, body) => request('POST', pathname, { query, body }),
    put: (pathname, query = {}, body) => request('PUT', pathname, { query, body }),
    del: (pathname, query = {}) => request('DELETE', pathname, { query }),
  }
}

// ---------------------------------------------------------------------------
// Board orchestration
// ---------------------------------------------------------------------------

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`)
}

async function resolveBoardId(api, flags) {
  if (flags.board) return flags.board
  const state = loadState()
  if (state.boardId) {
    try {
      await api.get(`/1/boards/${state.boardId}`, { fields: 'id' })
      return state.boardId
    } catch {
      // Board deleted — fall through and search by name.
    }
  }
  return null
}

async function ensureBoard(api, name, flags, { create = true } = {}) {
  const cached = await resolveBoardId(api, flags)
  if (cached) return api.get(`/1/boards/${cached}`)
  const boards = await api.get('/1/members/me/boards', { fields: 'id,name', filter: 'open' })
  const found = findByName(boards, name)
  if (found) return found
  if (!create) {
    // Read-only resolve for move/comment/snapshot/status — a typo'd board
    // name must not silently create an empty board.
    throw new Error(`Board "${name}" not found — run "trello init" first or pass --board <id>`)
  }
  return api.post('/1/boards', {}, { name, defaultLists: false, defaultLabels: false })
}

async function ensureLists(api, boardId, names) {
  const existing = await api.get(`/1/boards/${boardId}/lists`, { fields: 'id,name' })
  const result = []
  for (const name of names) {
    const list = findByName(existing, name) || (await api.post(`/1/boards/${boardId}/lists`, {}, { name }))
    result.push(list)
  }
  return result
}

async function ensureLabels(api, boardId, specs) {
  const existing = await api.get(`/1/boards/${boardId}/labels`, { fields: 'id,name,color' })
  const result = []
  for (const { name, color } of specs) {
    const label = findByName(existing, name) || (await api.post(`/1/boards/${boardId}/labels`, {}, { name, color }))
    result.push(label)
  }
  return result
}

async function resolveCard(api, boardId, target) {
  if (/^[a-f0-9]{24}$/i.test(target)) {
    try {
      return await api.get(`/1/cards/${target}`)
    } catch {
      // Not an id — fall through to title match.
    }
  }
  const cards = await api.get(`/1/boards/${boardId}/cards`, { fields: 'id,name,idList,shortUrl' })
  const card = findCardByTitle(cards, target)
  if (!card) throw new Error(`No card matching "${target}" on the board`)
  return card
}

/** All label specs for a spec: taxonomy + any extra spec.labels. */
function labelSpecsFor(spec) {
  const extra = Array.isArray(spec.labels) ? spec.labels : []
  return [...taxonomyLabels(), ...extra]
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function readSpec(specPath) {
  if (!fs.existsSync(specPath)) throw new Error(`Spec not found: ${specPath}`)
  let spec
  try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
  } catch (error) {
    throw new Error(`Could not parse spec ${specPath}: ${error.message}`)
  }
  const errors = validateSpec(spec)
  if (errors.length) throw new Error(`Spec invalid (${specPath}):\n  - ${errors.join('\n  - ')}`)
  return spec
}

async function cmdInit(api, flags) {
  const name = flags.name || 'Provance'
  const lists = flags.lists ? flags.lists.split(',') : DEFAULT_LISTS
  const board = await ensureBoard(api, name, flags, { create: true })
  const ensuredLists = await ensureLists(api, board.id, lists)
  const ensuredLabels = await ensureLabels(api, board.id, taxonomyLabels())
  saveState({ boardId: board.id })
  console.log(`✓ Board ready: "${board.name}" (${board.id})${board.shortUrl ? ` — ${board.shortUrl}` : ''}`)
  console.log(`  lists:  ${ensuredLists.map((l) => l.name).join(' · ')}`)
  console.log(`  labels: ${ensuredLabels.length}`)
  console.log('  Board id cached in scripts/.trello-state.json')
}

async function cmdPush(api, flags) {
  const specPath = flags.spec || DEFAULT_SPEC
  const spec = readSpec(specPath) // validates before any network call
  const board = await ensureBoard(api, spec.board || 'Provance', flags, { create: true })
  const listNames = spec.lists && spec.lists.length ? spec.lists : DEFAULT_LISTS
  const lists = await ensureLists(api, board.id, listNames)
  const labels = await ensureLabels(api, board.id, labelSpecsFor(spec))
  const listId = new Map(lists.map((l) => [l.name.toLowerCase(), l.id]))
  const labelId = new Map(labels.map((l) => [l.name, l.id]))

  const plan = spec.cards.map((card) => {
    const idLabels = [
      card.phase ? labelId.get(phaseLabel(card.phase)) : null,
      card.type ? labelId.get(typeLabel(card.type)) : null,
      card.priority ? labelId.get(priorityLabel(card.priority)) : null,
    ].filter(Boolean)
    return {
      title: String(card.title).trim(),
      idList: listId.get(String(card.list || 'Backlog').toLowerCase()),
      idLabels,
      desc: buildCardDesc({
        desc: card.desc,
        acceptance: card.acceptance,
        links: card.links,
      }),
    }
  })

  if (flags['dry-run']) {
    console.log(`[dry-run] ${plan.length} card(s) to upsert on board "${board.name}"`)
    for (const card of plan) {
      console.log(`  - ${card.title} → ${lists.find((l) => l.id === card.idList)?.name || '?'}${card.idLabels.length ? ` [${card.idLabels.length} label(s)]` : ''}`)
    }
    return
  }

  const cards = await api.get(`/1/boards/${board.id}/cards`, {
    fields: 'id,name,desc,idLabels,idList',
  })
  let created = 0
  let updated = 0
  for (const card of plan) {
    // Trello documents idLabels as a comma-separated string, not an array.
    const idLabels = card.idLabels.join(',')
    const existing = findCardByTitle(cards, card.title)
    if (existing) {
      await api.put(`/1/cards/${existing.id}`, {}, {
        desc: card.desc,
        idLabels,
        idList: card.idList,
      })
      updated += 1
    } else {
      await api.post('/1/cards', {}, {
        name: card.title,
        desc: card.desc,
        idLabels,
        idList: card.idList,
        pos: 'top',
      })
      created += 1
    }
  }
  console.log(`✓ push complete — ${created} created, ${updated} updated on "${board.name}"`)
}

async function cmdMove(api, flags, args) {
  const [target, listName] = args
  if (!target || !listName) throw new Error('Usage: trello move <card-title-or-id> <list-name>')
  const board = await ensureBoard(api, flags.name || 'Provance', flags, { create: false })
  const lists = await api.get(`/1/boards/${board.id}/lists`, { fields: 'id,name' })
  const list = findByName(lists, listName)
  if (!list) throw new Error(`List "${listName}" not found on the board`)
  const card = await resolveCard(api, board.id, target)
  await api.put(`/1/cards/${card.id}`, {}, { idList: list.id })
  console.log(`✓ Moved "${card.name}" → ${list.name}`)
}

async function cmdComment(api, flags, args) {
  const [target, text] = args
  if (!target || !text) throw new Error('Usage: trello comment <card-title-or-id> "text"')
  const board = await ensureBoard(api, flags.name || 'Provance', flags, { create: false })
  const card = await resolveCard(api, board.id, target)
  await api.post(`/1/cards/${card.id}/actions/comments`, {}, { text })
  console.log(`✓ Commented on "${card.name}"`)
}

async function loadBoardSnapshot(api, flags) {
  const board = await ensureBoard(api, flags.name || 'Provance', flags, { create: false })
  const [lists, cards, labels] = await Promise.all([
    api.get(`/1/boards/${board.id}/lists`, { fields: 'id,name' }),
    api.get(`/1/boards/${board.id}/cards`),
    api.get(`/1/boards/${board.id}/labels`, { fields: 'id,name,color' }),
  ])
  return { board, lists, cards, labels }
}

export function renderSnapshot({ board, lists, cards, labels }) {
  const lines = []
  lines.push(`# ${board.name} — Trello Board`)
  if (board.shortUrl) lines.push(`_${board.shortUrl}_`)
  lines.push(`_Updated ${new Date().toISOString()}_`)
  lines.push('')
  const cardsByList = {}
  for (const card of cards) {
    ;(cardsByList[card.idList] ||= []).push(card)
  }
  for (const list of lists) {
    const items = cardsByList[list.id] || []
    lines.push(`## ${list.name} (${items.length})`)
    if (!items.length) lines.push('_Empty_')
    for (const card of items) {
      const labelsText = card.labels?.length
        ? ` \`${card.labels.map((l) => l.name).join(', ')}\``
        : ''
      const link = card.shortUrl || card.id
      lines.push(`- **${card.name}**${labelsText} — <sub>${link}</sub>`)
    }
    lines.push('')
  }
  const summary = summarize(cards, lists, labels)
  lines.push('## Summary')
  lines.push(`- Total **${summary.total}** · Open **${summary.open}**`)
  const bucket = (title, map) => {
    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    if (entries.length) lines.push(`- ${title}: ${entries.map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  }
  bucket('Phases', summary.byPhase)
  bucket('Types', summary.byType)
  bucket('Priorities', summary.byPriority)
  return `${lines.join('\n')}\n`
}

async function cmdSnapshot(api, flags) {
  const snapshot = await loadBoardSnapshot(api, flags)
  const outPath = flags.out || DEFAULT_SNAPSHOT_OUT
  fs.writeFileSync(outPath, renderSnapshot(snapshot))
  console.log(`✓ Snapshot written to ${outPath}`)
}

async function cmdStatus(api, flags) {
  const { board, lists, cards, labels } = await loadBoardSnapshot(api, flags)
  const summary = summarize(cards, lists, labels)
  console.log(`${board.name} — ${summary.total} cards (${summary.open} open)`)
  for (const [name, count] of Object.entries(summary.byList)) {
    console.log(`  ${name}: ${count}`)
  }
  const bucket = (title, map) => {
    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    if (entries.length) console.log(`  ${title}: ${entries.map(([k, v]) => `${k} ${v}`).join(' · ')}`)
  }
  bucket('phases', summary.byPhase)
  bucket('types', summary.byType)
  bucket('priorities', summary.byPriority)
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const HELP = `Provance Trello CLI (zero-dependency)

Usage:
  trello init [--name Board] [--lists a,b,c]
  trello push [--spec path] [--dry-run] [--board id]
  trello move <card-title-or-id> <list-name>
  trello comment <card-title-or-id> "text"
  trello snapshot [--out path]
  trello status [--board id]

Environment:
  TRELLO_API_KEY   API key from https://trello.com/power-ups/admin
  TRELLO_TOKEN     token generated from the same page

Notes:
  All commands are idempotent — boards, lists, labels, and cards are matched
  by name and reused. The board id is cached in scripts/.trello-state.json
  (override with --board). Spec schema: see docs/trello-workflow.md.
`

function printHelp() {
  console.log(HELP)
}

function requireCredentials() {
  const key = process.env.TRELLO_API_KEY
  const token = process.env.TRELLO_TOKEN
  if (!key || !token) {
    throw new Error(
      'Set TRELLO_API_KEY and TRELLO_TOKEN (see docs/trello-workflow.md) — ' +
        'e.g. export TRELLO_API_KEY=…; export TRELLO_TOKEN=…',
    )
  }
  return createApi({ key, token })
}

export async function main(argv) {
  const { command, args, flags } = parseArgs(argv)
  if (flags.help || !command) {
    printHelp()
    return
  }
  // Fail fast on spec errors before requiring credentials, so `push` truly
  // validates before any network call (cmdPush re-reads the same file).
  if (command === 'push') readSpec(flags.spec || DEFAULT_SPEC)
  const api = requireCredentials()
  switch (command) {
    case 'init':
      await cmdInit(api, flags)
      break
    case 'push':
      await cmdPush(api, flags)
      break
    case 'move':
      await cmdMove(api, flags, args)
      break
    case 'comment':
      await cmdComment(api, flags, args)
      break
    case 'snapshot':
      await cmdSnapshot(api, flags)
      break
    case 'status':
      await cmdStatus(api, flags)
      break
    default:
      throw new Error(`Unknown command "${command}" — run "trello --help"`)
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`✗ ${error.message}`)
    process.exit(1)
  })
}
