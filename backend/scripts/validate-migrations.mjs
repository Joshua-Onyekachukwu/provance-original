#!/usr/bin/env node
/**
 * validate-migrations.mjs — one-command schema convergence check.
 *
 * Probes the live Supabase project against the SAME MIGRATION_PROBES list the
 * readiness `checks.migrations` gate uses (imported from
 * src/health/migration-health.service.ts via dist), so this script and
 * GET /v1/health/readiness can never disagree about what is applied.
 *
 * Probes use non-head REST selects (`?select=<column>&limit=1`) with the
 * service role key — the runbook's caveat: `head: true` / HEAD requests mask
 * PostgREST error bodies (PGRST205/42703), so a v1-style probe can report a
 * table as present when it is not.
 *
 * Exit code:
 *   0 — every probeable migration is applied
 *   1 — at least one migration is missing (prints the exact missing list,
 *       same format as the readiness detail) or a probe errored
 *
 * Run from backend/:  node scripts/validate-migrations.mjs   (or npm run
 * validate:migrations). Requires `npm run build` first (the probe list is
 * compiled from src) and backend/.env.local with SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (key) => {
  const m = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : null;
};

const SUPABASE_URL = get('SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('MISSING_ENV (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env.local)');
  process.exit(1);
}

let MIGRATION_PROBES;
try {
  ({ MIGRATION_PROBES } = await import('../dist/health/migration-health.service.js'));
} catch {
  console.error(
    'Could not load the probe list from dist/health/migration-health.service.js — run `npm run build` first (the probe list is compiled from src/health/migration-health.service.ts).',
  );
  process.exit(1);
}

const rest = async (table, column) => {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(column)}&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const body = res.ok ? null : await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, code: body?.code ?? '', message: body?.message ?? '' };
};

const rows = [];
const missing = [];
const errored = [];
let appliedCount = 0;
let skippedCount = 0;

for (const probe of MIGRATION_PROBES) {
  if (!probe.probeable || !probe.table || !probe.column) {
    rows.push({ ...probe, status: 'SKIP', detail: probe.note ?? 'not probeable' });
    skippedCount += 1;
    continue;
  }

  const result = await rest(probe.table, probe.column);

  if (result.ok) {
    rows.push({ ...probe, status: 'OK', detail: '' });
    appliedCount += 1;
    continue;
  }

  if (result.code === 'PGRST205' || result.code === '42703') {
    const kind = result.code === 'PGRST205' ? 'table' : 'column';
    rows.push({
      ...probe,
      status: 'MISSING',
      detail: `${result.code} (${kind} ${probe.table}.${probe.column})`,
    });
    missing.push(probe);
    continue;
  }

  rows.push({
    ...probe,
    status: 'ERROR',
    detail: `HTTP ${result.status} ${result.code || result.message}`.slice(0, 120),
  });
  errored.push(probe);
}

// ── Output ─────────────────────────────────────────────────────────────────
console.log('Migration schema check (probe list = readiness checks.migrations)');
console.log('─'.repeat(92));
console.log('migration  status   file                        detail');
console.log('─'.repeat(92));
for (const row of rows) {
  console.log(
    `${row.migration.padEnd(10)} ${row.status.padEnd(7)} ${String(row.file).padEnd(26)} ${row.detail}`,
  );
}
console.log('─'.repeat(92));
console.log(
  `applied: ${appliedCount} · missing: ${missing.length} · errored: ${errored.length} · skipped: ${skippedCount}`,
);

if (missing.length === 0 && errored.length === 0) {
  console.log('\nALL MIGRATIONS APPLIED — schema converged.');
  process.exit(0);
}

if (missing.length > 0) {
  const list = missing
    .map((m) => `${m.migration} (${m.file})`)
    .join(', ');
  console.log(`\nMISSING MIGRATIONS: ${list}`);
}
if (errored.length > 0) {
  const list = errored
    .map((m) => `${m.migration} (${m.file})`)
    .join(', ');
  console.log(`\nPROBE ERRORS: ${list}`);
}
process.exit(1);
