#!/usr/bin/env node
/**
 * check-migration-convergence.mjs — CI gate: the migration file set + order
 * must not drift from what MIGRATION_RUNBOOK.md documents.
 *
 * How it works:
 *   1. Runs the REAL applier in dry-run mode (`apply-migrations.mjs
 *      --dry-run`), which lists every file in supabase/migrations/ in
 *      dependency (numeric) order — the exact order the applier would apply
 *      them, and the exact order a dashboard paste must use. Dry-run never
 *      connects and never reads DATABASE_URL, so it is CI-safe even with no
 *      .env.local present.
 *   2. Parses the canonical migration manifest embedded in
 *      docs/engineering/MIGRATION_RUNBOOK.md between the
 *      `<!-- BEGIN MIGRATION MANIFEST -->` / `<!-- END MIGRATION MANIFEST -->`
 *      markers (the same source validate:migrations --runbook emits).
 *   3. Fails if the set OR the order drifted: a new migration file without a
 *      runbook regen, a renamed/reordered file, or a file the runbook lists
 *      that no longer exists on disk.
 *   4. Content-level banner check on the runbook's combined paste block: every
 *      `-- MIGRATION nnnn · <file>.sql` banner inside the fenced ```sql block
 *      must (a) carry the nnnn prefix that matches its filename, and (b) have
 *      the SQL underneath it byte-match (normalized) the on-disk migration
 *      file it claims — so a hand-edited or content-swapped section is caught
 *      too, not just set/order drift.
 *
 * All parse/diff logic lives in src/health/migration-convergence.ts (compiled
 * to dist/) so the gate itself is unit-tested — this script is the thin IO +
 * output shell.
 *
 * Exit codes: 0 = converged (file set + order + combined-block banners match
 * the runbook) · 1 = drift (prints the exact diff + the one-command fix) ·
 * 2 = env/usage error.
 *
 * Flags:
 *   --fix     regenerate the manifest section IN PLACE from the current
 *             supabase/migrations/ dir, then re-check — one command to
 *             converge the runbook after adding/renaming a migration.
 *   --runbook <path>   run against a different runbook path (tests).
 *
 * Run from backend/:  node scripts/check-migration-convergence.mjs
 *                     (npm run check:migrations)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isAbsolute, resolve } from 'node:path';

let buildManifestBlock, checkCombinedBlock, diffFileSets, MANIFEST_BEGIN, MANIFEST_END, parseManifest;
try {
  ({
    buildManifestBlock,
    checkCombinedBlock,
    diffFileSets,
    MANIFEST_BEGIN,
    MANIFEST_END,
    parseManifest,
  } = await import('../dist/health/migration-convergence.js'));
} catch {
  console.error(
    'Could not load the convergence helpers from dist/health/migration-convergence.js — run `npm run build` first (the pure parse/diff logic is compiled from src/health/migration-convergence.ts).',
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const runbookArg = args.indexOf('--runbook');
const RUNBOOK_PATH =
  runbookArg !== -1 && args[runbookArg + 1]
    ? isAbsolute(args[runbookArg + 1])
      ? pathToFileURL(args[runbookArg + 1])
      : pathToFileURL(resolve(process.cwd(), args[runbookArg + 1]))
    : new URL('../../docs/engineering/MIGRATION_RUNBOOK.md', import.meta.url);
const APPLIER = new URL('./apply-migrations.mjs', import.meta.url);

const out = (...parts) => console.log(...parts);

// 1. Real applier dry-run — the authoritative file set + order on disk.
const dry = spawnSync(process.execPath, [fileURLToPath(APPLIER), '--dry-run'], {
  encoding: 'utf8',
});
if (dry.status !== 0) {
  out(`APPLIER DRY-RUN FAILED (exit ${dry.status})`);
  out(dry.stderr || dry.stdout);
  process.exit(2);
}
const diskFiles = [];
for (const line of (dry.stdout || '').split(/\r?\n/)) {
  const m = line.match(/^WOULD APPLY\s+(\d{4}_.*\.sql)$/);
  if (m) diskFiles.push(m[1]);
}
if (diskFiles.length === 0) {
  out('ERROR: dry-run listed no migration files — check supabase/migrations/');
  process.exit(2);
}

// 2. The runbook's documented manifest.
let runbookText;
try {
  runbookText = readFileSync(RUNBOOK_PATH, 'utf8');
} catch {
  out(`ERROR: cannot read runbook at ${fileURLToPath(RUNBOOK_PATH)}`);
  process.exit(2);
}
let manifestFiles = parseManifest(runbookText);

if (fix) {
  const eol = runbookText.includes('\r\n') ? '\r\n' : '\n';
  const block = buildManifestBlock(diskFiles, eol);
  if (manifestFiles === null) {
    // No manifest yet — insert just before the founder-checklist marker so the
    // doc reads title → intro → canonical manifest → founder checklist.
    const anchor = runbookText.indexOf('<!-- BEGIN FOUNDER CHECKLIST');
    const insertAt =
      anchor !== -1 ? anchor : runbookText.search(/\r?\n/); // fallback: after title
    runbookText = `${runbookText.slice(0, insertAt)}${block}${eol}${eol}${runbookText.slice(insertAt)}`;
  } else {
    const start = runbookText.indexOf(MANIFEST_BEGIN);
    const end = runbookText.indexOf(MANIFEST_END) + MANIFEST_END.length;
    runbookText = `${runbookText.slice(0, start)}${block}${runbookText.slice(end)}`;
  }
  writeFileSync(RUNBOOK_PATH, runbookText, 'utf8');
  manifestFiles = diskFiles.slice();
  out(`Manifest regenerated in place → ${fileURLToPath(RUNBOOK_PATH)}`);
}

if (manifestFiles === null) {
  out('ERROR: no migration manifest found in the runbook.');
  out(`  Expected ${MANIFEST_BEGIN} ... ${MANIFEST_END} markers in ${fileURLToPath(RUNBOOK_PATH)}.`);
  out('  Run with --fix to embed the manifest from the current migration dir.');
  process.exit(2);
}

// 3. Compare set + order (pure logic in the module).
const { missing, extra, orderDrift } = diffFileSets(diskFiles, manifestFiles);

// 4. Content-level banner check on the combined paste block. The readFile
//    closure resolves supabase/migrations/<file> relative to this script and
//    returns null when the file is missing, which the module flags.
const combined = checkCombinedBlock(runbookText, (file) => {
  const filePath = new URL(`../../supabase/migrations/${file}`, import.meta.url);
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
});

out(`Migration convergence check — ${diskFiles.length} files on disk · ${manifestFiles.length} documented`);
if (combined) {
  out(
    `Combined-block banners — ${combined.count} sections` +
      (combined.count > 0 && combined.issues.length === 0 ? ' · content verified' : ''),
  );
}
out('─'.repeat(80));

const bannerIssues = combined ? combined.issues : [];

if (missing.length === 0 && extra.length === 0 && !orderDrift && bannerIssues.length === 0) {
  if (combined && combined.count === 0) {
    out('CONVERGED — file set + order match, but the combined block has no banner sections.');
  } else {
    out('CONVERGED — file set, order, and combined-block banners match the runbook.');
  }
  process.exit(0);
}

if (missing.length) {
  out('DRIFT: files on disk NOT in the runbook manifest:');
  for (const f of missing) out(`  + ${f}`);
}
if (extra.length) {
  out('DRIFT: files in the runbook manifest NOT on disk:');
  for (const f of extra) out(`  - ${f}`);
}
if (orderDrift && missing.length === 0 && extra.length === 0) {
  out('DRIFT: same file set, different order:');
  out(`  disk:     ${diskFiles.join(', ')}`);
  out(`  runbook:  ${manifestFiles.join(', ')}`);
}
if (bannerIssues.length) {
  out('DRIFT: combined-block banner/content mismatch (content-level mislabel):');
  for (const issue of bannerIssues) {
    out(`  ${issue.file} — ${issue.detail}`);
  }
}
out('');
out('Fix (one command): cd backend && npm run check:migrations -- --fix');
out('  (or regenerate the full runbook: npm run validate:migrations -- --runbook)');
process.exit(1);
