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
 * Paste-block auto-emit: when migrations are missing, the script joins the
 * missing migrations' source files (from supabase/migrations, in dependency
 * order — the same order the applier uses) into ONE ready-to-paste SQL block
 * and prints it, so a single command both checks the live schema AND produces
 * the exact fix. Flags:
 *   --no-emit             suppress the auto-emitted paste block (quiet CI)
 *   --paste-file <path>   write the block to a file and print a pointer
 *                         instead of dumping it to stdout
 *
 * Run from backend/:  node scripts/validate-migrations.mjs   (or npm run
 * validate:migrations). Requires `npm run build` first (the probe list is
 * compiled from src) and backend/.env.local with SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const emitBlock = !args.includes('--no-emit');
const pasteFileArg = args.find((a) => a.startsWith('--paste-file='))?.split('=')[1];

/**
 * Normalize one migration's source for the paste block: CRLF → LF, strip
 * trailing whitespace per line, drop leading/trailing blank lines — the same
 * normalization the proven `.freebuff/combined-0005-0020.sql` block uses, so
 * an emitted block and a hand-assembled one stay byte-comparable.
 */
const normalizeSql = (sql) =>
  sql
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/^\n+|\n+$/g, '');

/**
 * Join the missing migrations' sources into one paste block, dependency order.
 * Each section mirrors the proven combined-block format: a banner line, the
 * `-- MIGRATION <num> · <file>` header, then the migration's own content.
 */
function buildPasteBlock(missing) {
  const sections = missing.map((probe) => {
    const filePath = new URL(`../../supabase/migrations/${probe.file}`, import.meta.url);
    if (!existsSync(filePath)) {
      console.error(`  (warn: source file ${probe.file} not found on disk — skipped)`);
      return null;
    }
    const source = normalizeSql(readFileSync(filePath, 'utf8'));
    return [
      '-- =====================================================================',
      `-- MIGRATION ${probe.migration} · ${probe.file}`,
      '-- =====================================================================',
      source,
    ].join('\n');
  });
  return `${sections.filter(Boolean).join('\n\n')}\n`;
}

const emitPasteBlock = (missing) => {
  if (!emitBlock || missing.length === 0) return;
  const block = buildPasteBlock(missing);

  if (pasteFileArg) {
    // Resolve relative to the script's dir (backend/scripts/) — same
    // convention as the applier's paths — and print the real filesystem path.
    const outPath = new URL(pasteFileArg, import.meta.url);
    writeFileSync(outPath, block, 'utf8');
    console.log(
      `\nPASTE BLOCK WRITTEN → ${fileURLToPath(outPath)} (${block.split('\n').length} lines, ${missing.length} migrations)`,
    );
    return;
  }

  console.log(`\nPASTE BLOCK — ${missing.length} missing migrations in dependency order`);
  console.log('(paste into ' + DASHBOARD_URL + ', or set DATABASE_URL and run `npm run apply:migrations`)');
  console.log('─'.repeat(92));
  console.log(block.trimEnd());
};

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

// Project identity for the header banner — the one-command project/env
// mismatch diagnostic. Compare the ref below with the project id in the SQL
// Editor's browser URL bar; if they differ, the migrations you pasted went to
// a different project than the one this env probes.
const PROJECT_REF = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
const DASHBOARD_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

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
console.log(`project : ${PROJECT_REF}   (dashboard: ${DASHBOARD_URL})`);
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
  console.log(
    '\nPROJECT/ENV MISMATCH CHECK: this env probes project ' +
      `${PROJECT_REF}. If you applied migrations in the dashboard but they do` +
      '\nnot appear here, compare that ref with the project id in your SQL Editor\n' +
      `browser URL bar (it must read project/${PROJECT_REF}) — you may have pasted\n` +
      'into a different Supabase project. The dashboard link above opens the SQL\n' +
      'editor for exactly the project this env probes.',
  );
}
if (errored.length > 0) {
  const list = errored
    .map((m) => `${m.migration} (${m.file})`)
    .join(', ');
  console.log(`\nPROBE ERRORS: ${list}`);
}
// The one-command fix: the exact paste block, auto-emitted in the same
// dependency order the applier (apply-migrations.mjs) and the dashboard
// paste require.
emitPasteBlock(missing);
process.exit(1);
