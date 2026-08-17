---
name: provance-bullmq-redis-queue
description: "Provance's scan-processing queue: BullMQ + Redis (Upstash) worker conventions for the repo's backend. Use when touching the scan queue round-trip — queue service, worker process, job lifecycle (queued → processing → complete/failed), retries and exponential backoff, the inline no-Redis fallback, queue posture snapshots, REDIS_URL/Upstash wiring, or the scans-flow e2e specs. Triggers: BullMQ, Worker, Queue, enqueue, retries, backoff, jobId, REDIS_URL, Upstash, scan-processing, processQueuedScan, markScanFailed, inline fallback, queue-snapshot."
---

# Provance BullMQ/Redis Queue

The canonical contract is `docs/engineering/SCAN_UPLOAD_CONTRACT.md` — read it
alongside this skill before changing queue behavior. This skill encodes the
worker/queue conventions so edits stay consistent with the retry model, the
inline fallback, and the test suite.

## When to use

- Adding, changing, or debugging the scan queue: enqueue options, worker
  handler, retries/backoff, failure landing, queue posture.
- Wiring or re-wiring `REDIS_URL` (Upstash `rediss://` or local
  `redis://`), `SCAN_PROCESSING_QUEUE_NAME`, `WORKER_CONCURRENCY`.
- Extending the scan lifecycle statuses or the `submit`/`process` paths.
- Writing or updating queue-related tests (unit, e2e, or the live
  `validate:bullmq` walk).

## Architecture map

| File | Responsibility |
| ---- | -------------- |
| `backend/src/queue/queue.constants.ts` | `SCAN_PROCESSING_QUEUE_NAME = 'scan-processing'` |
| `backend/src/queue/queue.connection.ts` | `createRedisConnection(redisUrl)` — parses URL → BullMQ `ConnectionOptions` |
| `backend/src/queue/queue.module.ts` | `@Global()` module; provides/exports `QueueService` |
| `backend/src/queue/queue.service.ts` | `QueueService` — lazy Redis connection, `isConfigured()`, `enqueueScanProcessing(scanId)` with the job options |
| `backend/src/worker.ts` | The worker process (`node dist/worker`): claims jobs, drives `ScansService.processQueuedScan`, handles `ready`/`completed`/`failed`, graceful shutdown |
| `backend/src/scans/scans.service.ts` | `submit` enqueue-vs-inline branch; `processQueuedScan`; `runScanProcessing` (status guard → processing → complete); `markScanFailed` (idempotent terminal writer) |
| `backend/scripts/verify-bullmq.mjs` | `npm run validate:bullmq` — live proof the worker (not the request lifecycle) processed a job |
| `backend/test/scans-flow.e2e-spec.ts` | e2e: inline lifecycle + the "Scan flow with BullMQ enqueue" describe block |
| `docs/engineering/SCAN_UPLOAD_CONTRACT.md` | The lifecycle/endpoints/env contract — keep in sync with any change |

## Queue job contract (`QueueService.enqueueScanProcessing`)

The enqueue options are a **contract**, not a suggestion:

```ts
const options: JobsOptions = {
  jobId: scanId,          // one job per scan — re-adding the same scanId replaces, never duplicates
  removeOnComplete: 100,  // keep the last 100 completed jobs
  removeOnFail: 100,      // keep the last 100 failed jobs
  attempts: 3,            // BullMQ retries (the worker's 'failed' handler checks attemptsMade >= attempts)
  backoff: { type: 'exponential', delay: 1000 }, // 1s base, exponential
};
await this.queue.add('process-scan', { scanId }, options);
```

Rules:

- **`jobId: scanId` is mandatory.** It makes enqueue idempotent per scan —
  a retried `submit` replaces rather than stacks jobs. Never change it.
- Changing `attempts`, `backoff`, or `removeOn*` **must** be mirrored in the
  contract doc and the e2e assertions (they hard-code the retry shape).
- `QueueService` builds its BullMQ `Queue` **lazily from `REDIS_URL`**: no
  `REDIS_URL` → `queue` is null → `isConfigured()` is false → submit falls
  back to inline processing (see below). The worker refuses to boot without
  `REDIS_URL` (`process.exit(1)`), so there is no half-configured state.
- `QueueService` implements `OnModuleDestroy` and closes the queue — keep that
  so app shutdown doesn't hang on the Redis connection.

## Connection (`createRedisConnection`)

```ts
export function createRedisConnection(redisUrl: string): ConnectionOptions {
  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === 'rediss:';
  const db = parsed.pathname ? Number.parseInt(parsed.pathname.slice(1), 10) : undefined;
  return {
    host: parsed.hostname,
    port: parsed.port ? Number.parseInt(parsed.port, 10) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: Number.isInteger(db) ? db : undefined,
    maxRetriesPerRequest: null,  // BullMQ requirement — do not remove
    enableReadyCheck: false,     // keep; avoids stall on some managed Redis
    tls: isTls ? {} : undefined,
  };
}
```

Gotchas:

- **`maxRetriesPerRequest: null` is required by BullMQ** (blocks the
  "endless retry" behavior ioredis defaults to). Removing it breaks workers.
- **Upstash uses `rediss://`** — the REST token doubles as the TLS password
  (`rediss://default:<TOKEN>@<endpoint-host>:6379`). The `tls: {}` branch
  handles it; keep the protocol parsing intact.
- Do not parse `REDIS_URL` ad hoc elsewhere — reuse this helper.

## Lifecycle + the retry invariant (the core rule)

Status enum (`scan_status`): `awaiting_upload → queued → processing → complete`
(any step can land in `failed`).

```
submit ─► queued ─► [enqueue 'process-scan' (BullMQ)] ─► worker: processQueuedScan
         └─ no REDIS_URL ─► inline: runScanProcessing in the request lifecycle

processQueuedScan ─► runScanProcessing:
  1. status guard: skip unless queued/awaiting_upload/processing (idempotent re-entry)
  2. status → processing
  3. download asset, inspectUploadContent (empty/renamed-file rejection)
  4. SHA-256 dedup (0013): identical file by this user → reuse prior payload, complete
  5. buildAnalysisResultPayload (exifr + Jimp + fingerprints + C2PA) → complete
  6. on error: log "(will retry)" and RETHROW
```

**The invariant that makes retries work:**

- `runScanProcessing` **rethrows on failure and leaves the row in
  `processing`** — never marks it `failed`. A retried attempt re-enters via
  the status guard and passes.
- The terminal `failed` state is written **only when retries are exhausted**:
  - BullMQ path — the worker's `failed` event calls
    `ScansService.markScanFailed(scanId, error.message)` when
    `attemptsMade >= attempts` (3).
  - Inline path — the submit-time error handler calls `markScanFailed` (no
    retry tier inline; a failure lands the row failed immediately).
- `markScanFailed` is **idempotent and race-safe**: it re-reads the row and
  refuses to downgrade anything already `complete` (e.g. a concurrent dedup
  hit). Never bypass it with a bare status update.

## Inline fallback (no Redis)

`submitScan` branches on `queueService.isConfigured()`:

```ts
if (this.queueService.isConfigured()) {
  await this.queueService.enqueueScanProcessing(scanId);
} else {
  void this.runScanProcessing(adminClient, scan).catch((error) => {
    void this.markScanFailed(scan.id, reason).catch((markError) => { /* log */ });
  });
}
```

- Inline processing runs **in the request lifecycle** — fine for demos/tests,
  not production concurrency. The `validate-scan-roundtrip.mjs` live walk
  covers both paths and prints which one ran.
- Do not add a retry tier to the inline path — that is what BullMQ is for.

## Worker (`backend/src/worker.ts`)

- Runs as a separate process: `cd backend && npm run start:worker`
  (`node dist/worker`), concurrency from `WORKER_CONCURRENCY` (default 4).
- Job handler: validates `job.data.scanId` is a string, then calls
  `scansService.processQueuedScan(scanId)` — **the worker is stateless**; it
  re-reads the row each attempt, so a crashed worker restarts safely.
- `failed` handler: `markScanFailed` on the **final** attempt only (best-effort;
  a concurrent inline path may have already landed a terminal state).
- Graceful shutdown on `SIGINT`/`SIGTERM` (`worker.close()` then `app.close()`).
  Keep the event handlers; they are the observability surface.

## Config & env

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `REDIS_URL` | *(unset)* | `redis://` or `rediss://`. Unset → inline fallback + worker refuses to boot |
| `SCAN_PROCESSING_QUEUE_NAME` | `scan-processing` | Overridable; the worker reads the same var |
| `WORKER_CONCURRENCY` | `4` | Worker only |

> **PORT gotcha (this machine):** the shell inherits a `PORT`, and dotenv
> does not override already-set env vars, so the API can bind the wrong port.
> Start explicitly: `PORT=4000 node dist/main`. Check the log for
> `EADDRINUSE` on a non-4000 port if requests stop resolving.

## Verification & testing

- **Live queue proof:** `cd backend && npm run build && npm run validate:bullmq`
  (needs a running backend + worker + `REDIS_URL`). Seeing BullMQ
  `waiting → active → …` states plus the worker log `Completed scan job <id>`
  proves the separate worker process did the work.
- **e2e:** `backend/test/scans-flow.e2e-spec.ts` — "Scan flow with BullMQ
  enqueue" mocks `QueueService.isConfigured() === true` and asserts the
  enqueue call + `processQueuedScan` driving `queued → processing →
  completed`; a failure branch asserts retry-reject then `markScanFailed`;
  and a race branch asserts `markScanFailed` never downgrades a completed
  scan. Run with `cd backend && npm run test:e2e`.
- **Unit:** `backend/src/scans/scans.service.spec.ts` mocks the Supabase admin
  client; keep the queue mocking (`isConfigured`/`enqueueScanProcessing`)
  consistent between unit and e2e layers.
- **Full round-trip:** `backend/scripts/validate-scan-roundtrip.mjs` walks
  initiate → signed-URL upload → submit → poll → report → PDF against a live
  backend; it records which processing path (inline vs BullMQ) ran.

## Hard rules

1. **Never mark a scan `failed` from inside `runScanProcessing`** — the retry
   model depends on the row staying `processing` between attempts. The only
   terminal writers are the worker's `failed` event and the inline error
   handler, both via `markScanFailed`.
2. **Never change the enqueue `jobId` or retry shape** without updating
   `SCAN_UPLOAD_CONTRACT.md` and the e2e assertions in the same change.
3. **Never remove `maxRetriesPerRequest: null`** from the connection options.
4. **Keep `jobId: scanId`** — enqueue idempotency depends on it.
5. **Don't spin up a second Queue/Worker** — `QueueModule` is `@Global`; inject
   `QueueService` and reuse `worker.ts` patterns. A new queue needs a new
   constants entry + a deliberate choice between the existing worker process
   and a sibling one, documented in the contract.
6. **Keep `markScanFailed` idempotent** — its re-read + `complete`-no-downgrade
   guard is what makes concurrent retry/inline paths safe.
