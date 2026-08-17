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
 *   --runbook             emit the founder-facing checklist section for
 *                         docs/engineering/MIGRATION_RUNBOOK.md (per-migration
 *                         click-to-open SQL Editor links + the combined block)
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

/**
 * Founder-facing metadata for the runbook checklist (--runbook mode).
 * Keep in sync with docs/engineering/MIGRATION_RUNBOOK.md when a migration
 * changes what it unlocks or its verify count.
 */
const RUNBOOK_META = {
  '0005': {
    unlocks: 'org API + invites + member role/team + team scoping + admin org views',
    verify: '4 tables',
  },
  '0007': { unlocks: 'admin monitoring incidents section', verify: '5 incident rows' },
  '0008': { unlocks: 'admin audit logs (GET /v1/admin/audit-logs)', verify: '15 audit rows' },
  '0009': { unlocks: '**scan round-trip hard gate** (POST /v1/scans)', verify: '3 columns' },
  '0010': { unlocks: 'active-sessions surface + readiness hard gate', verify: '2 tables' },
  '0011': { unlocks: 'notifications API + bell', verify: '1 table' },
  '0012': { unlocks: 'team scoping on profiles (admin team filter)', verify: '1 column' },
  '0013': { unlocks: 'scan dedup (file_hash_sha256)', verify: '1 column' },
  '0014': { unlocks: 'crash reports (POST /v1/telemetry/errors)', verify: '1 table' },
  '0015': { unlocks: 'hardened invite tokens (token_hash)', verify: '1 column' },
  '0016': { unlocks: 'role scopes (admin roles page)', verify: '1 table' },
  '0017': { unlocks: 'dev-account session seed', verify: '3 rows (conditional)' },
  '0018': { unlocks: 'better-auth tables (informational — live auth runs on GoTrue)', verify: '12 tables' },
  '0019': { unlocks: 'idempotent POST /scans (idempotency_key)', verify: '1 column' },
  '0020': { unlocks: 'API usage (billing meters)', verify: '1 table' },
  '0021': { unlocks: 'scan attempt telemetry (attempts_made / max_attempts)', verify: '2 columns' },
};

/**
 * Emit the founder-facing checklist section for MIGRATION_RUNBOOK.md
 * (--runbook mode): one click-to-open SQL Editor link per pending migration
 * (pre-filled via the ?query= param — degrades to a blank editor for the
 * right project if the dashboard ignores it) plus the full combined paste
 * block. The output is wrapped in BEGIN/END markers so a regenerate is a
 * clean replace of the section in the doc.
 */
function buildRunbookSection(rows) {
  const pending = rows.filter((r) => r.status !== 'OK');
  const lines = [];
  lines.push('<!-- BEGIN FOUNDER CHECKLIST — regenerated by `node scripts/validate-migrations.mjs --runbook`; do not hand-edit between markers -->');
  lines.push('## ⚡ Founder checklist — one paste converges the schema');
  lines.push('');
  if (pending.length === 0) {
    lines.push(`**Project:** \`${PROJECT_REF}\` · ✅ **All probeable migrations are applied** — schema converged, nothing to paste. (Re-verify: \`cd backend && npm run validate:migrations\`.)`);
    lines.push('');
    lines.push('<!-- END FOUNDER CHECKLIST -->');
    return lines.join('\n');
  }
  lines.push(
    `**Project:** \`${PROJECT_REF}\` · **Current state:** ${appliedCount} applied / ${pending.length} pending (${skippedCount} seed-only) — re-probe anytime with \`npm run validate:migrations\`.`,
  );
  lines.push('');
  lines.push('Each row opens the SQL Editor **pre-filled** with that migration: click, **Run**, check the verify count, tick the box. Or skip the clicks and paste the **full combined block** at the bottom once — every file is idempotent and the order is dependency-correct.');
  lines.push('');
  lines.push('| Done | Migration | File | Unlocks | Verify (expect) | SQL Editor |');
  lines.push('| ---- | --------- | ---- | ------- | --------------- | ---------- |');
  for (const r of pending) {
    const filePath = new URL(`../../supabase/migrations/${r.file}`, import.meta.url);
    const source = existsSync(filePath) ? normalizeSql(readFileSync(filePath, 'utf8')) : '';
    const link = `${DASHBOARD_URL}?query=${encodeURIComponent(source)}`;
    const meta = RUNBOOK_META[r.migration] || { unlocks: '', verify: '' };
    lines.push(`| [ ] | ${r.migration} | \`${r.file}\` | ${meta.unlocks} | ${meta.verify} | [Open →](${link}) |`);
  }
  lines.push('');
  lines.push('**After the paste** — one command: `cd backend && npm run validate:migrations` (expect `applied: 20 · missing: 0 · skipped: 1`), then `curl http://localhost:4000/v1/health/readiness` (expect `"status": "ready"`). Or skip the dashboard entirely once `DATABASE_URL` is set in `backend/.env.local`: `npm run apply:migrations -- --verify`.');
  lines.push('');
  lines.push('<details><summary>📋 Full combined block — paste once (all pending migrations, dependency order)</summary>');
  lines.push('');
  lines.push('```sql');
  lines.push(buildPasteBlock(pending));
  lines.push('```');
  lines.push('');
  lines.push('</details>');
  lines.push('');
  lines.push('<!-- END FOUNDER CHECKLIST -->');
  return lines.join('\n');
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

if (args.includes('--runbook')) {
  // --runbook: emit the founder-facing checklist section for MIGRATION_RUNBOOK.md
  // (see buildRunbookSection). Always exits 0 — it is a doc generator, not a gate.
  console.log(buildRunbookSection(rows));
  process.exit(0);
}

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
