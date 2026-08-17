// Verify the scan queue processes jobs through BullMQ (not the inline
// fallback). Inserts a real `queued` scan row via the service role, enqueues
// a job with the same options ScansService uses (jobId = scanId, attempts 3,
// exponential backoff), and polls both the BullMQ job state and the row's
// status until the worker has claimed it.
//
// NOTE: with the inline fallback this script would have no queue to watch —
// seeing waiting → active → failed/completed states at the queue level is the
// proof the worker (not the request lifecycle) processed the job.
//
// Run from backend/: node scripts/verify-bullmq.mjs
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
// Dev admin (auth.users) — used only as the row owner; the worker is unscoped.
const DEV_ADMIN_ID = 'ad85f4db-ee6b-4da6-8743-f03fe82ca7d1';

if (!SUPABASE_URL || !SERVICE_KEY || !REDIS_URL) {
  console.error('MISSING_ENV (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / REDIS_URL)');
  process.exit(1);
}

const rest = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    ...opts,
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const scanId = randomUUID();
const now = new Date().toISOString();

// 1. Insert a real `queued` scan row (service role bypasses RLS).
const insert = await rest('/scans', {
  method: 'POST',
  body: JSON.stringify({
    id: scanId,
    user_id: DEV_ADMIN_ID,
    status: 'queued',
    original_filename: 'bullmq-verification.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: 1024,
    storage_bucket: 'provance-uploads',
    storage_path: `verification/${scanId}/bullmq-verification.jpg`,
    created_at: now,
    updated_at: now,
  }),
});
if (!insert.ok) {
  console.error('INSERT FAILED', insert.status, await insert.text());
  process.exit(1);
}
console.log(`Inserted queued scan ${scanId}`);

// 2. Enqueue through the real BullMQ queue with the service's exact options.
const queue = new Queue(QUEUE_NAME, { connection: createRedisConnection(REDIS_URL) });
await queue.add(
  'process-scan',
  { scanId },
  { jobId: scanId, removeOnComplete: 100, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
);
console.log(`Enqueued job ${scanId} on queue "${QUEUE_NAME}"`);

// 3. Poll the job state + the row status until the worker acts.
let lastJobState = '';
let lastRowStatus = '';
for (let i = 0; i < 25; i += 1) {
  await sleep(2000);
  const job = await queue.getJob(scanId);
  const jobState = job ? await job.getState() : 'gone';
  const rows = await (await rest(`/scans?select=id,status,failure_reason&id=eq.${scanId}`)).json();
  const rowStatus = rows?.[0]?.status ?? '?';
  const reason = rows?.[0]?.failure_reason
    ? ` reason="${String(rows[0].failure_reason).slice(0, 140)}"`
    : '';
  if (jobState !== lastJobState || rowStatus !== lastRowStatus) {
    console.log(`  t+${(i + 1) * 2}s  job=${jobState.padEnd(9)} row=${rowStatus}${reason}`);
    lastJobState = jobState;
    lastRowStatus = rowStatus;
  }
  if (jobState === 'failed' || jobState === 'completed') break;
}

const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
console.log('BullMQ job counts:', JSON.stringify(counts));
await queue.close();

// 4. Tidy up the throwaway verification row.
const cleanup = await rest(`/scans?id=eq.${scanId}`, { method: 'DELETE' });
console.log(`Cleanup ${cleanup.ok ? 'ok' : `failed (${cleanup.status})`} — removed verification row ${scanId}`);
