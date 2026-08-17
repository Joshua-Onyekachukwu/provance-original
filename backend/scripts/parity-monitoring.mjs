// Dev-only parity walk: compare the REAL GET /v1/admin/monitoring payload
// (fetched live from the backend against Supabase) with mockMonitoring,
// field-by-field, focusing on queue_health (hourly_series/daily_series),
// storage_utilization, and db_performance.
//
// Drift classification:
//   HARD  — structural breaks that would break the page (missing keys, wrong
//           element shapes, non-ISO dates, non-integer counts, non-monotonic
//           series). Exits 2.
//   SOFT  — value-level differences the page already renders honestly (nulls
//           → '—', fewer buckets, zero live counts). Reported, but do not
//           fail the walk: they are data-driven, not contract breaks.
//
// Usage: node backend/scripts/parity-monitoring.mjs
// Expects .freebuff/real-monitoring.json (the live payload) in the repo root.
import { readFileSync } from 'node:fs'
import { mockMonitoring } from '../../src/lib/mockData.js'

const real = JSON.parse(readFileSync('.freebuff/real-monitoring.json', 'utf8'))

let hardCount = 0
const soft = []

const typeOf = (value) => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `array[${value.length}]`
  return typeof value
}

function compareSection(section, mock, realValue, depth = 0) {
  if (realValue === undefined) {
    console.log(`  ${' '.repeat(depth * 2)}✗ HARD ${section}: MISSING in real`)
    hardCount += 1
    return
  }
  if (mock === null || realValue === null) {
    if (mock !== realValue) {
      soft.push(`${section}: mock=${typeOf(mock)} real=${typeOf(realValue)}`)
    }
    return
  }
  if (typeof mock === 'object' && !Array.isArray(mock)) {
    for (const key of Object.keys(mock)) {
      compareSection(`${section}.${key}`, mock[key], realValue[key], depth)
    }
    return
  }
  if (Array.isArray(mock)) {
    if (realValue.length !== mock.length) {
      soft.push(`${section}: mock ${mock.length} rows, real ${realValue.length}`)
    }
    if (realValue.length > 0 && mock.length > 0) {
      for (const key of Object.keys(mock[0])) {
        if (!(key in realValue[0])) {
          console.log(`  ${' '.repeat(depth * 2)}✗ HARD ${section}[].${key}: missing in real elements`)
          hardCount += 1
        }
      }
      for (const key of Object.keys(realValue[0])) {
        if (!(key in mock[0])) {
          console.log(`  ${' '.repeat(depth * 2)}✗ HARD ${section}[].${key}: only in real`)
          hardCount += 1
        }
      }
    }
    return
  }
  // Scalars: null-vs-finite is soft (page renders '—'); any other type break is hard.
  if (typeOf(mock) !== typeOf(realValue)) {
    if (realValue === null) {
      soft.push(`${section}: mock=${typeOf(mock)} real=null`)
    } else {
      console.log(`  ${' '.repeat(depth * 2)}✗ HARD ${section}: mock=${typeOf(mock)} (${mock}) real=${typeOf(realValue)} (${realValue})`)
      hardCount += 1
    }
  }
}

// Deep series checks — the full contract, row by row: key sets on EVERY row
// (not just the first), ISO timestamps, integer counts, and monotonic
// oldest→newest ordering.
function checkSeries(name, mockRows, realRows, timeKey, countKeys) {
  console.log(`\n── ${name} (mock ${mockRows.length} rows, real ${realRows.length} rows) ──`)
  if (mockRows.length !== realRows.length) {
    soft.push(`${name}: mock ${mockRows.length} rows, real ${realRows.length}`)
  }
  const contractKeys = [timeKey, ...countKeys]
  const badKeys = realRows.filter(
    (r) => Object.keys(r).sort().join() !== contractKeys.slice().sort().join(),
  )
  if (badKeys.length) {
    console.log(`  ✗ HARD ${name}: ${badKeys.length} real rows have a non-contract key set`)
    hardCount += 1
  }
  const badValues = realRows.filter((r) => {
    const time = r[timeKey]
    const counts = countKeys.map((k) => r[k])
    const timeOk = typeof time === 'string' && !Number.isNaN(Date.parse(time))
    const countsOk = counts.every((c) => Number.isInteger(c))
    return !timeOk || !countsOk
  })
  if (badValues.length) {
    console.log(`  ✗ HARD ${name}: ${badValues.length} real rows fail ISO-date / integer-count`)
    hardCount += 1
  }
  const times = realRows.map((r) => Date.parse(r[timeKey]))
  const monotonic = times.every((t, i) => i === 0 || t >= times[i - 1])
  if (!monotonic) {
    console.log(`  ✗ HARD ${name}: real series not monotonic oldest→newest`)
    hardCount += 1
  }
  console.log(
    `  ${hardCount === 0 ? 'ok' : '…'} real: ${contractKeys.length} keys/row on all rows | ISO + ints | monotonic ${monotonic}`,
  )
  if (realRows.length > 0) {
    console.log(`     real row[0]: ${JSON.stringify(realRows[0])}`)
    console.log(`     mock row[0]: ${JSON.stringify(mockRows[0])}`)
  }
}

console.log('=== Field-by-field: mockMonitoring vs real /v1/admin/monitoring ===\n')

for (const section of ['queue_health', 'storage_utilization', 'db_performance']) {
  console.log(`── ${section} ──`)
  compareSection(section, mockMonitoring[section], real[section])
}

checkSeries(
  'hourly_series',
  mockMonitoring.queue_health.hourly_series,
  real.queue_health?.hourly_series || [],
  'hour',
  ['processed'],
)
checkSeries(
  'daily_series',
  mockMonitoring.queue_health.daily_series,
  real.queue_health?.daily_series || [],
  'date',
  ['processed', 'completed', 'failed'],
)

console.log('\n── overall / services / incidents (context) ──')
console.log(`  overall:   ${JSON.stringify(real.overall)}`)
console.log(`  services:  ${real.services.length} rows; mock ${mockMonitoring.services.length}`)
console.log(`  incidents: ${real.incidents.length} rows (live: admin_incidents missing → degraded); mock ${mockMonitoring.incidents.length}`)

if (soft.length) {
  console.log('\n── SOFT drifts (data-driven; page renders as \'—\') ──')
  soft.forEach((s) => console.log(`  · ${s}`))
}

console.log(
  `\n=== ${hardCount === 0 ? 'CONTRACT PARITY' : `${hardCount} HARD DRIFT POINT(S)`} (${soft.length} soft) ===`,
)
process.exit(hardCount === 0 ? 0 : 2)
