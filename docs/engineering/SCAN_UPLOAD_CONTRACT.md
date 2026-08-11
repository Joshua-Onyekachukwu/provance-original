# Scan Upload & Queue Round-Trip Contract

The Media Upload page (`/app/uploads`) drives a five-stage lifecycle:
**initiate → signed-URL upload → submit → queue → worker → complete**.
The frontend already routes every step to the backend behind the `USE_MOCK` gate
(`src/lib/api.js`); this document is the contract the backend implements
(`backend/src/scans/` + `backend/src/queue/` + `backend/src/worker.ts`) and the
schema it reads (`supabase/migrations/0002_scans.sql` + `0009_scan_processing.sql`).

## Lifecycle

```
┌──────────┐   POST /scans    ┌─────────────────┐   uploadToSignedUrl   ┌──────────────┐
│  Client  │ ───────────────► │ awaiting_upload │ ◄──────────────────── │  Supabase    │
│ (Uploads │                  │  (row inserted, │  (bucket + token)     │  Storage     │
│  page)   │                  │   signed URL)   │                      └──────────────┘
└──────────┘                  └─────────────────┘
        │
        │  POST /scans/:id/submit  (asset-exists check → status queued)
        ▼
┌──────────┐   enqueue 'process-scan' (BullMQ, scan-processing)   ┌──────────┐
│  queued  │ ───────────────────────────────────────────────────► │  Worker  │
└──────────┘                    or inline fallback (no Redis)      │ (dist/  │
                                                                  │  worker) │
        │  worker: status → processing, downloads asset, runs      └──────────┘
        │  analysis (exifr + Jimp + fingerprints + C2PA check),            │
        │  writes result_payload                                          │
        ▼                                                                 ▼
┌──────────────┐  failure        ┌────────┐            ┌─────────────────────────┐
│   complete   │ ──────────────► │ failed │            │ result_payload + verdict│
└──────────────┘                 └────────┘            │ (report payload ready)  │
                                                       └─────────────────────────┘
```

Status enum (`scan_status`, defined in `0002_scans.sql`, mirrored by
`backend/src/scans/scans.types.ts`):

`awaiting_upload → queued → processing → complete` (any terminal step can
transition to `failed` via the worker's try/catch).

## Endpoints

Base path: `/v1` (global NestJS prefix). All routes require a valid Supabase
bearer session (`SupabaseAuthGuard`) and are throttled at 20 req/min.

| Method | Path                        | Frontend function     | Purpose                                     |
| ------ | --------------------------- | --------------------- | ------------------------------------------- |
| POST   | `/scans`                    | `initiateScan`        | Validate + create the record, return signed upload URL |
| POST   | `/scans/:scanId/submit`     | `submitScan`          | Verify the upload landed, enqueue the job   |
| GET    | `/scans`                    | `listScans`           | Scan ledger (newest first)                  |
| GET    | `/scans/:scanId`            | `getScan`             | Single scan + 1h asset preview URL          |
| GET    | `/scans/queue-snapshot`      | `getQueueSnapshot`   | Queue posture `{queued, processing, failed, avg_processing_time_ms}` |
| GET    | `/reports/:reportId`        | `getReport`           | Report payload (signal-by-signal evidence)  |
| GET    | `/reports/:reportId/pdf`    | `exportReportPdf`     | Server-generated PDF blob                   |

### 1. `POST /scans` — initiate

Request body (strictly validated, `InitiateScanDto`):

```jsonc
{
  "originalFilename": "campaign-shot.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 2457600,
  "mediaType": "image",                 // only "image" today
  "processingMode": "standard"          // optional: quick | standard | deep
}
```

Rejections (all `400` unless noted):

- `mediaType !== 'image'` → "Only image uploads are supported right now."
- mime type not in the allow-list → "Unsupported file type."
- `fileSizeBytes > MAX_UPLOAD_BYTES` (default 50 MB) → "File exceeds the maximum allowed size."
- **`402`** with `Retry-After` when the plan's scan quota is exhausted
  (`BillingService.assertScanQuota`), surfaced by the Uploads page as the
  dedicated quota-exhausted state.

Success (`201`) creates the scans row with
`status = 'awaiting_upload'`, `storage_path = {userId}/{scanId}/{sanitizedFilename}`
(team auto-resolved from an active org membership, best-effort), and returns:

```jsonc
{
  "scanId": "uuid",
  "status": "awaiting_upload",
  "bucket": "provance-uploads",
  "path": "{userId}/{scanId}/campaign-shot.jpg",
  "token": "signed-upload-token",
  "signedUrl": "https://.../upload/..."
}
```

### 2. Client-side upload (signed URL)

The frontend streams the file directly to Supabase Storage using the returned
bucket + path + token (`src/pages/app/AppUploadsPage.jsx`):

```js
const { error } = await supabase.storage
  .from(initiation.bucket)
  .uploadToSignedUrl(initiation.path, initiation.token, selectedFile, {
    contentType: selectedFile.type,
    upsert: false,
  })
```

The bucket is private (`0002_scans.sql` inserts `provance-uploads` with
`public = false`); uploads are only possible with a valid signed token, and
reads go through `createSignedUrl` preview URLs (1h).

### 3. `POST /scans/:scanId/submit`

- `404` if the scan doesn't exist or isn't owned by the caller.
- `400` if `status !== 'awaiting_upload'` ("Scan is not ready to be submitted.").
- `400` if the object isn't in storage yet (`storage.info` pre-flight,
  "The file has not been uploaded yet…").
- On success (`202`): flips the row to `queued`, then:
  - **Redis configured** → `queueService.enqueueScanProcessing(scanId)` adds a
    BullMQ job named `process-scan` to the `scan-processing` queue
    (`jobId = scanId`, `attempts: 3`, exponential backoff 1s,
    `removeOnComplete/removeOnFail: 100`).
  - **Redis not configured** → inline fallback: `runScanProcessing` executes in
    the request lifecycle (development convenience; the worker is the
    production path).

Returns `{ "scanId": "...", "status": "queued" }`.

### 4. Worker processing

`backend/src/worker.ts` runs as a separate process (`node dist/worker`). On each
job it calls `ScansService.processQueuedScan(scanId)`, which:

1. Fetches the scan (worker uses the scanId only — no user scoping).
2. Marks `processing`.
3. Downloads the asset from storage, computes:
   - EXIF/capture metadata (`exifr`), image statistics (`Jimp`: entropy, edge
     density, blockiness, luminance, saturation),
   - SHA-256 + MD5 fingerprints, detected format vs. declared MIME check,
   - C2PA content-credential marker scan.
4. Builds the four signals (`file_integrity`, `metadata_forensics`,
   `visual_statistics`, `provenance_credentials`), the verdict
   (`likely_authentic | suspicious | inconclusive`), and the report payload
   (top-level `payload_version: '1.0.0'`, methodology `0.2.0-mvp`,
   `report_id` `PRV-XXXXXXXX`).
5. Writes `status = 'complete'` with `result_payload`, `completed_at`, and
   clears `failure_reason`. Any thrown error lands the scan in `failed` with
   `failure_reason` set (worker retries up to 3 attempts first).

### Payload versioning

`result_payload.payload_version` uses **semantic-lite** `MAJOR.MINOR.PATCH`:

- **MAJOR** — breaking shape changes (renamed/removed signals, changed verdict
  enum, reorganized sections). Consumers must branch on it; old payloads are
  migrated or explicitly unsupported.
- **MINOR** — additive changes (new signal, new metadata field) that keep every
  existing field intact; consumers keep working.
- **PATCH** — value-level fixes (threshold tweaks, label corrections) with no
  shape change.

The mock payload (`src/lib/mockData.js`) mirrors the same `payload_version` so
mock and real mode cannot drift; the mock seam `?payload=v2` (if used) would
force a future MAJOR bump to prove the consumer handles both. The strategy is
referenced from `docs/engineering/API_DESIGN_STANDARDS.md` (schema versioning
P1 checklist item).

### 5. Read surfaces

- `GET /scans` → `{ data: [...], scans: [...] }` (both aliases; each row is the
  frontend dialect: `status: 'completed'` for DB `complete`, flat `verdict`
  `authentic|suspicious|inconclusive`, `processing_mode`, `team_id`,
  `completed_at`, `result_payload` + flat `report_id` mirror).
- `GET /scans/:scanId` → `{ scan: { ...row, asset_preview_url } }`.
- `GET /scans/queue-snapshot` → `{ queued, processing, failed, avg_processing_time_ms }`
  (avg from `result_payload.metadata.total_processing_time_ms`, falling back to
  created→completed wall clock).

## Environment variables

Required together for any real mode (validated in `backend/src/config/env.validation.ts`):

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `SUPABASE_URL` | — | Must be set together with the two keys below |
| `SUPABASE_ANON_KEY` | — | |
| `SUPABASE_SERVICE_ROLE_KEY` | — | The admin client the scans service uses (bypasses RLS) |

Upload/queue configuration:

| Variable | Default | Notes |
| -------- | ------- | ----- |
| `SUPABASE_UPLOADS_BUCKET` | `provance-uploads` | Private storage bucket |
| `MAX_UPLOAD_BYTES` | `52428800` (50 MB) | |
| `ALLOWED_UPLOAD_MIME_TYPES` | `image/jpeg,image/png,image/webp,image/gif` | |
| `REDIS_URL` | *(unset)* | `redis://` or `rediss://`. Unset → inline fallback + worker refuses to boot |
| `SCAN_PROCESSING_QUEUE_NAME` | `scan-processing` | BullMQ queue name |
| `WORKER_CONCURRENCY` | `4` | Worker only |

Table-name overrides (all default to the migration names): `SUPABASE_SCANS_TABLE`,
`SUPABASE_ORGANIZATION_MEMBERS_TABLE`. Report URLs need `FRONTEND_ORIGIN`
(comma-separated allow-list; defaults include `localhost:3000/3001/5173`).

The Supabase migration set must be applied **before** real mode works —
`0002_scans.sql` (scans table + `scan_status` + storage bucket) and
`0009_scan_processing.sql` (`processing_mode`, `team_id`, `completed_at`
columns + status indexes). If 0009 is missing, the service returns a
`503` with an actionable hint (schema error `42703`/`PGRST204` → "migration
0009 not applied").

> For the full step-by-step (0003–0010, dependency order, per-migration
> verification) see `docs/engineering/MIGRATION_RUNBOOK.md`.

## Running the worker locally (live demo)

Prerequisites: backend deps installed (`pnpm install` in `backend/`), a
Supabase project with migrations 0002 + 0009 applied (dashboard SQL Editor if
pg-meta is locked), and a Redis instance — either local (`redis-server`, or
`docker run -d -p 6379:6379 redis:7-alpine`) or Upstash (a `rediss://` URL).

### Provisioning a throwaway Upstash Redis (no signup)

`POST https://upstash.com/start-redis` returns a free database (endpoint +
token) with a 3-day expiry — enough to exercise the queue locally. The
BullMQ `REDIS_URL` is `rediss://default:<TOKEN>@<endpoint-host>:6379` (the
REST token doubles as the TLS password; `createRedisConnection` parses it).
Re-fetch the same database with `Idempotency-Key: <database-id>` if the
credentials are lost, and claim it at the returned console URL to keep it
past 3 days.

### Verifying the queue path (BullMQ vs inline)

`npm run validate:bullmq` (backend) inserts a real `queued` scan row via the
service role, enqueues a `process-scan` job with the exact options
`ScansService` uses, and polls both the BullMQ job state and the row status
until the worker claims it. Seeing `waiting → active → …` states at the
queue level — plus the worker log `Completed scan job <id>` — is the proof
the separate worker process (not the request lifecycle) processed the job.
The verification row is deleted afterwards.

1. **Configure env** — create `backend/.env.local` from `backend/.env.example`
   with at least `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   and `REDIS_URL`.

   > **PORT gotcha (this machine):** the shell inherits `PORT=62392`, and
derivatives of dotenv do not override already-set env vars, so the API
binds the inherited port instead of the `PORT=4000` in `.env.local`.
Start it explicitly: `PORT=4000 node dist/main` (and check the log for
`EADDRINUSE` on a non-4000 port if requests stop resolving).

2. **Build + start the API** (terminal 1):

   ```bash
   cd backend
   pnpm run build
   pnpm run start:prod        # or: pnpm run start:dev for watch mode
   ```

   Without `REDIS_URL` the API still boots and scans process inline (great for a
   no-Redis demo); with it, submitted scans wait for a worker.

3. **Start the worker** (terminal 2) — requires `REDIS_URL`:

   ```bash
   cd backend
   pnpm run start:worker      # runs node dist/worker (concurrency from WORKER_CONCURRENCY)
   ```

   The worker logs `Worker is ready for queue "scan-processing" with concurrency 4.`
   on connect and `Completed scan job <scanId>.` per job.

4. **Run the frontend in real mode** — production builds default to real
   (`USE_MOCK` is env-driven via `VITE_USE_MOCK`; see `src/lib/api.js`). For a
   dev run against the live backend, start vite with `VITE_USE_MOCK=false` and
   `VITE_API_BASE_URL` pointing at the backend (e.g. `http://localhost:4000/v1`
   in the frontend `.env.local`). Sign in, then run
   the upload at `/app/uploads` — the page walks create-record → signed upload →
   queue; the queue page polls `getQueueSnapshot`/`listScans` and the scan
   flips to `processing` → `completed` with a verdict as the worker runs.
   `?demo=start` (dev builds) auto-seeds a sample image for a hands-off demo.

   Verification ID + status transitions are visible in the queue ledger; a
   completed scan opens the report payload (`/app/reports`) and PDF export.

## Schema

| Table / object | Notes |
| -------------- | ----- |
| `public.scans` | `id` uuid PK, `user_id`, `status` `scan_status` enum, `original_filename`, `mime_type`, `file_size_bytes`, `storage_bucket`, `storage_path`, `result_payload` jsonb, `failure_reason`, `processing_mode` (0009), `team_id` (0009), `completed_at` (0009), `created_at`/`updated_at` |
| `storage.buckets.provance-uploads` | private, 50 MB file-size limit, allow-listed image MIME types |

RLS: the `scans` table is owner-scoped for select/insert/update by
`auth.uid() = user_id`. The backend uses the service-role admin client
(bypasses RLS) for status transitions, so direct Supabase access sees rows but
cannot flip statuses without the service.

## Mock-to-real mapping

| Mock (`src/lib/mockApi.js` / `mockData.js`) | Real |
| ------------------------------------------- | ---- |
| `mockInitiateScan` (immediate `awaiting_upload`) | `POST /scans` + `createSignedUploadUrl` |
| `mockSubmitScan` (async → queued) | `POST /scans/:id/submit` + BullMQ enqueue |
| mock queue polling (`useMockData` loop) | `GET /scans/queue-snapshot` + `GET /scans` |
| mock report payload (`sampleReportContent.js`) | `result_payload` written by the worker |
| `USE_MOCK` env gate (`src/lib/api.js`) | unset → real in prod / mock in dev; `VITE_USE_MOCK=false` forces real |

## Notes & gotchas

- **Inline fallback** (`REDIS_URL` unset) processes synchronously inside
  `submitScan` — fine for demos, not for production concurrency.
- **402 quota gate** is enforced at initiate time, *before* any row is created,
  so a spent quota never leaves dangling `awaiting_upload` records.
- The worker is **stateless and idempotent**: it re-reads the scan row, skips
  scans already past `queued` (`processing`/`complete` are safe re-entry
  guards), and writes failures as row state, so a crashed worker can be
  restarted safely.
- `submitScan` requires the upload to exist (storage pre-flight) — the signed
  URL alone is not enough; the file must actually be in the bucket.
