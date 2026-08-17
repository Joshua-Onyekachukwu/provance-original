// Verify the scan queue's RETRY path through BullMQ (not the inline fallback).
//
// The happy path (upload a real file → worker completes) is covered by
// validate:scan-roundtrip.mjs. This script proves the failure machinery that
// round-trip cannot: enqueue a scan whose storage download is GUARANTEED to
// fail, then assert the full terminal contract —
//
//   1. The worker claims the job (`active`) and fails it; BullMQ re-queues
//      with exponential backoff (attempts: 3, 1s base) instead of failing
//      fast — observed as job.attemptsMade progressing 1 → 2 → 3 with the
//      scan row left in `processing` between attempts ("will retry").
//   2. On the FINAL attempt the row lands in `failed` with the download
//      reason, attempts_made = 3, max_attempts = 3 (migration 0021).
//   3. A `scan.failed` audit row is written (audit_logs, migration 0008)
//      with the attempt telemetry in details.
//
// How the failure is made deterministic: a real 1×1 PNG is uploaded to the
// scan's storage path through the storage API (service role), then deleted
// BEFORE the job is enqueued — the object is gone before the worker can ever
// claim the job, so `download` fails on every attempt, every run.
//
// Pre-flight schema probes name the exact missing migration when the
// terminal assertions can't pass yet (attempts_made → 0021, audit_logs →
// 0008), so a not-yet-migrated project still gets an actionable result.
//
// Run from backend/: node scripts/verify-bullmq.mjs   (npm run validate:bullmq)
// Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// + REDIS_URL, `npm run build` (dist/queue/queue.connection.js), and a
// running worker (`npm run start:worker`) to claim the job.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Queue } = require('bullmq');
const { createRedisConnection } = require('../dist/queue/queue.connection.js');

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const get = (key) => {
  const m = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? m[1].trim() : null;
};

const SUPABASE_URL = get('SUPABASE_URL');
const SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY');
const REDIS_URL = get('REDIS_URL');
const QUEUE_NAME = get('SCAN_PROCESSING_QUEUE_NAME') || 'scan-processing';
const BUCKET = get('SUPABASE_UPLOADS_BUCKET') || 'provance-uploads';
// Dev admin (auth.users) — used only as the row owner; the worker is unscoped.
const DEV_ADMIN_ID = 'ad85f4db-ee6b-4da6-8743-f03fe82ca7d1';

if (!SUPABASE_URL || !SERVICE_KEY || !REDIS_URL) {
  console.error('MISSING_ENV (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / REDIS_URL)');
  process.exit(1);
}

const rest = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });

const storage = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/storage/v1${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(opts.headers || {}),
    },
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The same 1×1 transparent PNG the e2e specs use — a real asset through the
// storage API, so the retry walk exercises a genuine file, not a phantom.
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const scanId = randomUUID();
const storagePath = `verification/${scanId}/retry-probe.png`;

const results = [];
const notes = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const note = (text) => {
  notes.push(text);
  console.log(`note  ${text}`);
};

// Pre-flight schema probes — name the exact migration when a terminal
// assertion cannot pass yet (matching validate-migrations' probe codes).
async function preflight() {
  const attempts = await rest(
    `/scans?select=${encodeURIComponent('attempts_made')}&limit=1`,
  );
  if (attempts.status === 400 && attempts.body?.code === '42703') {
    note('scans.attempts_made missing (42703) — migration 0021 not applied; the retry CYCLE will still run, but the attempts_made/max_attempts row assertions will fail until it lands');
  }
  const audit = await rest('/audit_logs?select=id&limit=1');
  if (audit.status === 404 && audit.body?.code === 'PGRST205') {
    note('audit_logs table missing (PGRST205) — migration 0008 not applied; the scan.failed audit assertion will fail until it lands');
  }
}

async function main() {
  console.log(`Retry-path BullMQ verification — scan ${scanId} on queue "${QUEUE_NAME}"`);
  await preflight();

  // 1. Insert a real `queued` scan row (service role bypasses RLS). Its
  //    storage path is the object we are about to upload and then delete.
  const insert = await rest('/scans', {
    method: 'POST',
    body: JSON.stringify({
      id: scanId,
      user_id: DEV_ADMIN_ID,
      status: 'queued',
      original_filename: 'retry-probe.png',
      mime_type: 'image/png',
      file_size_bytes: ONE_PX_PNG.length,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!insert.ok) {
    console.error('INSERT FAILED', insert.status, await insert.text());
    process.exit(1);
  }
  check('queued scan row inserted (service role)', true, scanId);

  // 2. Upload a REAL file to that path (the "with a real file" leg), then
  //    delete it BEFORE enqueueing — the download is now guaranteed to fail
  //    on every attempt, deterministically.
  const upload = await storage(`/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: { 'x-upsert': 'false', 'Content-Type': 'image/png' },
    body: ONE_PX_PNG,
  });
  check(
    'real 1×1 PNG uploaded to the scan path (storage API)',
    upload.ok,
    upload.ok ? `${ONE_PX_PNG.length} bytes → ${storagePath}` : `HTTP ${upload.status} ${await upload.text()}`,
  );
  const remove = await storage(`/object/${BUCKET}/${storagePath}`, {
    method: 'DELETE',
  });
  check(
    'object deleted before enqueue — download guaranteed to fail',
    remove.ok,
    remove.ok ? '' : `HTTP ${remove.status} ${await remove.text()}`,
  );

  // 3. Enqueue through the real BullMQ queue with the service's exact options
  //    (QueueService.enqueueScanProcessing: jobId = scanId, attempts 3,
  //    exponential backoff 1s, removeOnComplete/removeOnFail 100).
  const queue = new Queue(QUEUE_NAME, { connection: createRedisConnection(REDIS_URL) });
  await queue.add(
    'process-scan',
    { scanId },
    { jobId: scanId, removeOnComplete: 100, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
  );
  console.log(`Enqueued job ${scanId} on queue "${QUEUE_NAME}" (attempts 3, exponential backoff 1s)`);

  // 4. Retry watcher — poll the JOB (1s cadence) and the ROW. Track the
  //    attemptsMade progression and the wall-clock gap between active claims
  //    (the backoff delay), and stop at the terminal failed state.
  const attempts = [];
  const activeTimes = [];
  const rowStatuses = [];
  let lastAttemptsMade = 0;
  let lastActiveAttempt = -1;
  let lastJobState = '';
  let lastRowStatus = 'queued';
  let terminalJobState = null;
  const t0 = Date.now();

  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    const job = await queue.getJob(scanId);
    if (!job) {
      console.log(`  t+${((Date.now() - t0) / 1000).toFixed(1)}s  job=gone`);
      continue;
    }
    const jobState = await job.getState();
    const attemptsMade = job.attemptsMade ?? 0;
    // select=* (not the explicit column list) so the row still reads when
    // 0021/0009 columns are absent — the watcher degrades to what exists.
    const row = (await (await rest(`/scans?select=*&id=eq.${scanId}`)).json())?.[0];
    const rowStatus = row?.status ?? '?';

    if (jobState !== lastJobState || attemptsMade !== lastAttemptsMade || rowStatus !== lastRowStatus) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `  t+${elapsed.padStart(5)}s  job=${String(jobState).padEnd(8)} attempts=${attemptsMade}  row=${rowStatus}${row?.failure_reason ? ` reason="${String(row.failure_reason).slice(0, 90)}"` : ''}`,
      );
    }
    if (jobState !== lastJobState) lastJobState = jobState;
    if (attemptsMade !== lastAttemptsMade) {
      attempts.push(attemptsMade);
      lastAttemptsMade = attemptsMade;
    }
    if (jobState === 'active' && attemptsMade !== lastActiveAttempt) {
      activeTimes.push({ attemptsMade, at: Date.now() });
      lastActiveAttempt = attemptsMade;
    }
    if (rowStatus !== lastRowStatus) {
      rowStatuses.push({ status: rowStatus, at: Date.now(), reason: row?.failure_reason ?? null });
      lastRowStatus = rowStatus;
    }
    if (jobState === 'failed' || jobState === 'completed') {
      terminalJobState = jobState;
      break;
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Retry walk finished at t+${elapsed}s — terminal job state: ${terminalJobState ?? 'timeout'}`);

  // Backoff evidence: the gaps between consecutive active claims ARE the
  // backoff delays (BullMQ only re-claims after the configured delay).
  if (activeTimes.length >= 2) {
    const gaps = [];
    for (let i = 1; i < activeTimes.length; i += 1) {
      gaps.push(((activeTimes[i].at - activeTimes[i - 1].at) / 1000).toFixed(1));
    }
    note(`backoff gaps observed between active claims (s): ${gaps.join(', ')} — exponential with 1s base (observed gaps include the 1s poll cadence + scheduler latency, so expect ≥ the theoretical 1s / 2s)`);
  }

  // 5. Terminal assertions.
  check('job terminal state is failed (not completed, not stuck)', terminalJobState === 'failed', terminalJobState ?? 'timeout');

  const finalJob = await queue.getJob(scanId);
  const finalAttemptsMade = finalJob?.attemptsMade ?? 0;
  const finalMaxAttempts = finalJob?.opts?.attempts ?? 0;
  check('job burned the full 3-attempt budget', finalAttemptsMade === 3, `attemptsMade=${finalAttemptsMade} / opts.attempts=${finalMaxAttempts}`);
  check(
    'job actually retried (≥ 2 distinct attempts observed)',
    Math.max(0, ...attempts) >= 2,
    `observed attemptsMade progression: ${attempts.length ? attempts.join(' → ') : '(none)'}`,
  );

  const finalRow = (await (await rest(`/scans?select=*&id=eq.${scanId}`)).json())?.[0];
  check('row landed in failed', finalRow?.status === 'failed', finalRow?.status ?? '(row missing)');
  check(
    'failure_reason names the guaranteed download failure',
    typeof finalRow?.failure_reason === 'string' && /download/i.test(finalRow.failure_reason),
    finalRow?.failure_reason ? String(finalRow.failure_reason).slice(0, 120) : '(missing)',
  );
  check(
    'attempts telemetry persisted on the row (0021)',
    finalRow?.attempts_made === 3 && finalRow?.max_attempts === 3,
    finalRow ? `attempts_made=${finalRow.attempts_made} max_attempts=${finalRow.max_attempts}` : '(row missing)',
  );

  const audit = (await (await rest(`/audit_logs?select=actor_email,action,severity,entity_id,details&entity_id=eq.${scanId}`)).json())?.[0];
  const auditDetails = audit?.details ?? null;
  check(
    'scan.failed audit row written with the attempt telemetry (0008)',
    audit?.action === 'scan.failed' &&
      audit?.entity_id === scanId &&
      auditDetails?.attempts_made === 3 &&
      auditDetails?.max_attempts === 3,
    audit
      ? `actor=${audit.actor_email} severity=${audit.severity} attempts_made=${auditDetails?.attempts_made} max_attempts=${auditDetails?.max_attempts}`
      : '(no audit row)',
  );

  const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
  note(`BullMQ job counts: ${JSON.stringify(counts)}`);
  await queue.close();

  // 6. Tidy up the throwaway verification row (the object is already gone).
  const cleanup = await rest(`/scans?id=eq.${scanId}`, { method: 'DELETE' });
  console.log(`Cleanup ${cleanup.ok ? 'ok' : `failed (${cleanup.status})`} — removed verification row ${scanId}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? 'ALL RETRY-PATH CHECKS PASSED' : `${failed.length} CHECK(S) FAILED`} (${results.length - failed.length}/${results.length} pass)`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Verification crashed:', error.message);
  process.exit(1);
});
