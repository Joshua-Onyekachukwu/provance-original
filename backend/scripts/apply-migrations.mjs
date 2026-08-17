#!/usr/bin/env node
/**
 * apply-migrations.mjs — one-command Supabase migration applier.
 *
 * Replaces the dashboard SQL-Editor paste loop: reads supabase/migrations in
 * numeric order and executes each file as a single multi-statement query via
 * the pg client built from DATABASE_URL. The migration files use
 * IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards throughout, so the whole
 * set is safe to run more than once.
 *
 * Usage (from backend/):
 *   node scripts/apply-migrations.mjs            # apply every migration
 *   node scripts/apply-migrations.mjs --dry-run  # list what WOULD run, no connection
 *   node scripts/apply-migrations.mjs --from 0009  # only 0009 and newer
 *   node scripts/apply-migrations.mjs --verify   # after applying, auto-run the
 *                                                # schema probe (validate:migrations)
 *                                                # and fail if any migration is
 *                                                # still missing — one command
 *                                                # applies AND confirms convergence
 *
 * Requires backend/.env.local with DATABASE_URL (the Supabase pooler / direct
 * Postgres connection string from the dashboard → Connect → Session pooler).
 * Optional SUPABASE_URL prints the project ref for the mismatch check.
 *
 * Exit codes: 0 all applied · 1 a migration failed (stops at the first
 * failure so dependencies stay ordered) · 2 env/config error.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(here, '../../supabase/migrations');
const ENV_PATH = resolve(here, '../.env.local');

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verifyAfter = args.includes('--verify');
const fromArg = args.find((a) => a.startsWith('--from='))?.split('=')[1];

const env = loadEnv(ENV_PATH);
const databaseUrl = env.DATABASE_URL;
const projectRef = env.SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0] ?? 'unknown';

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();
const fromIndex = fromArg ? files.findIndex((f) => f.startsWith(fromArg)) : 0;
const selected = fromIndex === -1 ? [] : files.slice(fromIndex);

if (selected.length === 0) {
  console.error(
    fromArg
      ? `No migrations found starting at ${fromArg} in ${MIGRATIONS_DIR}`
      : `No migration files found in ${MIGRATIONS_DIR}`,
  );
  process.exit(2);
}

console.log(`Provance migration applier — project ${projectRef}`);
console.log(`migrations dir : ${MIGRATIONS_DIR}`);
console.log(`scope          : ${fromArg ? `${fromArg} → ${selected[selected.length - 1]}` : `${selected[0]} → ${selected[selected.length - 1]}`} (${selected.length} file${selected.length === 1 ? '' : 's'})`);
console.log('─'.repeat(88));

if (dryRun) {
  for (const file of selected) console.log(`WOULD APPLY  ${file}`);
  console.log('─'.repeat(88));
  console.log('Dry run — nothing was applied. Set DATABASE_URL to apply.');
  process.exit(0);
}

if (!databaseUrl) {
  console.error(
    'MISSING_ENV: DATABASE_URL is not set in backend/.env.local.\n' +
      '  Paste the Supabase connection string (dashboard → Connect → Session pooler),\n' +
      '  e.g. postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres\n' +
      '  (or a direct db.<ref>.supabase.co:5432 URL), then re-run this script.\n' +
      '  The migrations can also be applied by pasting supabase/migrations/*.sql in the\n' +
      '  dashboard SQL Editor of the same project.',
  );
  process.exit(2);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: databaseUrl });

let appliedCount = 0;
try {
  await client.connect();
  for (const file of selected) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    try {
      // Simple query mode executes multi-statement SQL + DO blocks verbatim.
      await client.query(sql);
      appliedCount += 1;
      console.log(`APPLIED      ${file}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAILED       ${file}`);
      console.error(`  ${message.split('\n')[0].slice(0, 200)}`);
      console.error(
        `  Stopped at ${file} — earlier migrations are applied; fix and re-run (idempotent guards make re-runs safe).`,
      );
      process.exitCode = 1;
      break;
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`CONNECT FAILED: ${message.split('\n')[0].slice(0, 200)}`);
  console.error('Check DATABASE_URL (project ref, password, pooler vs direct).');
  process.exitCode = 2;
} finally {
  await client.end().catch(() => {});
}

console.log('─'.repeat(88));
if (process.exitCode === 0) {
  console.log(`ALL ${appliedCount} MIGRATIONS APPLIED — project ${projectRef} is converged.`);

  if (verifyAfter) {
    // One-command convergence: re-probe the live schema so a paste is never
    // trusted blindly — if the probe reports anything missing, fail loudly.
    const { spawnSync } = await import('node:child_process');
    console.log('\nVerifying against the live schema (validate:migrations)...');
    const verify = spawnSync(
      process.execPath,
      [resolve(here, 'validate-migrations.mjs'), '--no-emit'],
      { stdio: 'inherit', cwd: here },
    );
    if (verify.status !== 0) {
      process.exitCode = 1;
    }
  } else {
    console.log('Re-check with: cd backend && npm run validate:migrations');
  }
} else {
  console.log(`Applied ${appliedCount} of ${selected.length} — see the failure above.`);
}
