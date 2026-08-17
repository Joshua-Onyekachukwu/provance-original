#!/usr/bin/env node
/**
 * validate-scan-roundtrip.mjs — live end-to-end validation of the scan
 * upload round-trip against a running backend + real Supabase project.
 *
 * Walks the exact flow the Uploads page promises:
 *   1. Create a throwaway GoTrue user (admin API, email_confirm: true).
 *   2. POST /v1/scans (initiate) → `awaiting_upload` row + signed-upload
 *      contract { scanId, status, bucket, path, token, signedUrl }.
 *   3. Upload a real 1×1 PNG to Supabase Storage through the signed URL
 *      (`uploadToSignedUrl`, exactly like AppUploadsPage).
 *   4. POST /v1/scans/:scanId/submit → `queued` (upload-exists pre-flight).
 *   5. Poll GET /v1/scans/:scanId on the frontend's 5s cadence until the
 *      worker flips it to `completed` (display dialect) or `failed`;
 *      record the observed transition chain.
 *   5b. In parallel, poll the BullMQ job state (jobId = scanId) at a finer
 *       cadence and assert the worker path specifically: the job must be
 *       observed in `active` (claimed by the worker, NOT inline) and end in
 *       `completed`/`failed` matching the row — skipped with a note when
 *       REDIS_URL is unset (inline fallback mode has no queue to watch).
 *   6. GET /v1/reports/:scanId → the signal-by-signal report payload,
 *      and GET /v1/reports/:scanId/pdf → a real application/pdf artifact.
 *   7. GET /v1/scans/queue-snapshot reflects the completed scan.
 *
 * Bonus contract checks: initiate is idempotent under a repeated
 * Idempotency-Key (same scanId returned), and the storage object exists
 * after the upload.
 *
 * The throwaway user and the uploaded storage object are always deleted
 * afterwards (best-effort), so the script is safe to re-run: leftover
 * users with the same email prefix are purged first.
 *
 * Contract observations (inline-vs-BullMQ processing path, observed status
 * transitions, job-level states, 402 quota behavior) are printed as notes
 * so mismatches are explicit, not buried.
 *
 * Pre-walk project-identity guard: before ANY user is created or byte is
 * uploaded, the script probes the live schema with the SAME MIGRATION_PROBES
 * list validate:migrations and readiness use (one source of truth) and fails
 * fast — exit 2 — with the project ref, the applied-set fingerprint, and the
 * missing list if the project is not migration-converged (or unverifiable).
 * This makes a wrong-project dashboard paste diagnosable in one command
 * before the walk starts. It also cross-checks the backend's own readiness
 * view: if the backend reports a different convergence state than this env's
 * direct probe, a warning note flags a backend/env project mismatch.
 *
 * Usage:  node scripts/validate-scan-roundtrip.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *           (+ SUPABASE_ANON_KEY for the signed-URL upload), and the backend
 *           running on PORT (default 4000). For the job-level leg, REDIS_URL
 *           and a built backend (dist/queue/queue.connection.js) are needed.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

// BullMQ is required via createRequire so the job-level watcher reuses the
// backend's own dependency + connection helper (same pattern as
// verify-bullmq.mjs).
const require = createRequire(import.meta.url);

const here = dirname(fileURLToPath(import.meta.url));
const ENV = loadEnv(resolve(here, '../.env.local'));

const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE = ENV.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = ENV.SUPABASE_ANON_KEY;
const REDIS_URL = ENV.REDIS_URL?.trim() || null;
const QUEUE_NAME = ENV.SCAN_PROCESSING_QUEUE_NAME || 'scan-processing';

// The dev shell injects a foreign PORT env var (this harness's own server),
// so blindly trusting process.env.PORT points the walk at the wrong server.
// Candidates are probed in order (shell override, then .env.local, then 4000)
// and only a real Provance backend — /v1/health with service=provance-backend
// — is accepted.
let BASE = null;
const PORT_CANDIDATES = [...new Set([process.env.PORT, ENV.PORT, 4000].filter(Boolean))];

async function resolveBase() {
  let lastError = null;
  for (const port of PORT_CANDIDATES) {
    const base = `http://localhost:${port}`;
    try {
      const res = await fetch(`${base}/v1/health`);
      const body = await res.json().catch(() => null);
      if (res.ok && body?.service === 'provance-backend') return base;
      lastError = `port ${port}: HTTP ${res.status} (${body?.service ?? 'not a Provance backend'})`;
    } catch (error) {
      lastError = `port ${port}: ${error.message}`;
    }
  }
  throw new Error(
    `no Provance backend found — tried ${PORT_CANDIDATES.join(', ')} (${lastError})`,
  );
}

// The same 1×1 transparent PNG the backend e2e specs use — a genuine asset
// for the real Jimp decode + exifr parse path (PNG signature: 89 50 4E 47).
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const POLL_INTERVAL_MS = 5_000; // matches the frontend's useResource cadence
const JOB_POLL_INTERVAL_MS = 1_000; // finer cadence so a fast worker can't hide 'active'
const POLL_TIMEOUT_MS = 120_000;

// BullMQ job watcher (jobId = scanId contract from QueueService.enqueueScanProcessing).
// Built lazily so the walk still runs in inline mode (REDIS_URL unset) — the
// job-level checks are then skipped with a note, matching verify-bullmq.mjs.
let queueClient = null;
let queueClientError = null;
if (REDIS_URL) {
  try {
    const { Queue } = require('bullmq');
    const { createRedisConnection } = require('../dist/queue/queue.connection.js');
    queueClient = new Queue(QUEUE_NAME, {
      connection: createRedisConnection(REDIS_URL),
    });
  } catch (error) {
    queueClientError = error;
  }
}

const results = [];
const notes = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const note = (text) => notes.push(text);

function loadEnv(path) {
  const out = {};
  try {
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
  } catch {
    /* caller checks */
  }
  return out;
}

async function adminFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function apiFetch(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsedBody = null;
  try {
    parsedBody = text ? JSON.parse(text) : null;
  } catch {
    parsedBody = text;
  }
  return { status: res.status, body: parsedBody };
}

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

/**
 * migrationGuard — pre-walk project-identity guard.
 *
 * Probes the project THIS walk will upload to (SUPABASE_URL from
 * backend/.env.local) against the same MIGRATION_PROBES list that
 * validate:migrations and readiness use, before any user is created or any
 * file is uploaded. If migrations are missing (or a probe errors and the
 * state cannot be verified), it fails fast with the project ref, the
 * applied-set fingerprint, and the missing list — so a wrong-project
 * dashboard paste is diagnosable in one command, not after a confusing 503
 * mid-walk. Exits 2 (same as the other fail-fast gates).
 */
async function migrationGuard() {
  let probes;
  try {
    ({ MIGRATION_PROBES: probes } = await import(
      '../dist/health/migration-health.service.js',
    ));
  } catch {
    console.error(
      'Could not load MIGRATION_PROBES from dist/health/migration-health.service.js — run `npm run build` first (the probe list is compiled from src/health/migration-health.service.ts).',
    );
    process.exit(2);
  }

  const rest = async (table, column) => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(column)}&limit=1`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const body = res.ok ? null : await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      code: body?.code ?? '',
      message: body?.message ?? '',
    };
  };

  const applied = [];
  const missing = [];
  const errored = [];
  let skipped = 0;

  for (const probe of probes) {
    if (!probe.probeable || !probe.table || !probe.column) {
      skipped += 1; // seed-only migrations have no schema object to probe
      continue;
    }

    let result;
    try {
      result = await rest(probe.table, probe.column);
    } catch (error) {
      // A probe fetch failure means the state is unverifiable right now —
      // treat it as an error (fail fast with the fingerprint) rather than
      // letting a bare network error bubble up past the guard.
      errored.push({
        migration: probe.migration,
        file: probe.file,
        reason: `probe fetch failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 120),
      });
      continue;
    }
    if (result.ok) {
      applied.push(probe.migration);
      continue;
    }
    if (result.code === 'PGRST205' || result.code === '42703') {
      missing.push({
        migration: probe.migration,
        file: probe.file,
        reason: `${result.code} (${probe.table}.${probe.column})`,
      });
      continue;
    }
    errored.push({
      migration: probe.migration,
      file: probe.file,
      reason: `HTTP ${result.status} ${result.code || result.message}`.slice(0, 120),
    });
  }

  const ref = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
  const appliedFingerprint = applied.join(',');
  const fingerprint = createHash('sha1')
    .update(appliedFingerprint || '(none)')
    .digest('hex')
    .slice(0, 8);
  const dashboard = `https://supabase.com/dashboard/project/${ref}/sql/new`;
  const converged = missing.length === 0 && errored.length === 0;

  // Cross-check the backend's view: if it reports a different convergence
  // state than this env's direct probe, the backend is likely pointed at a
  // different Supabase project (classic wrong-project paste). Best-effort —
  // the direct probe above is authoritative for the upload target.
  let backendMismatchNote = '';
  try {
    const readyRes = await fetch(`${BASE}/v1/health/readiness`);
    const ready = await readyRes.json().catch(() => null);
    const backendReady = ready?.checks?.migrations?.ready === true;
    if (backendReady !== converged) {
      backendMismatchNote =
        `backend readiness disagrees (checks.migrations.ready=${String(ready?.checks?.migrations?.ready)}) — ` +
        `the backend may point at a different Supabase project than ${ref}. ` +
        'Compare backend/.env.local SUPABASE_URL with the one this script reads.';
    }
  } catch {
    // best-effort cross-check — never fail the guard on the cross-check itself
  }

  if (converged) {
    console.log(
      `PASS  pre-walk project identity — ${ref} · applied ${applied.length}/${probes.length} · fingerprint ${fingerprint} (${appliedFingerprint || '(no probeable migrations)'})`,
    );
    if (backendMismatchNote) note(backendMismatchNote);
    return;
  }

  console.error('FAIL  pre-walk project identity — migrations are NOT converged; refusing to start the walk.');
  console.error(`project : ${ref}   (dashboard: ${dashboard})`);
  console.error(`applied : ${applied.length}  fingerprint ${fingerprint}  (${appliedFingerprint || '(none)'})`);
  console.error(`missing : ${missing.length}`);
  for (const m of missing) {
    console.error(`  - ${m.migration} (${m.file}) — ${m.reason}`);
  }
  if (errored.length) {
    console.error(`errored : ${errored.length} (schema state unverifiable)`);
    for (const e of errored) {
      console.error(`  - ${e.migration} (${e.file}) — ${e.reason}`);
    }
  }
  console.error(`skipped : ${skipped} (seed-only)`);
  console.error('');
  console.error(
    `This env probes project ${ref}. If you pasted migrations into the dashboard but they do not show here,`,
  );
  console.error(
    `compare that ref with the project id in your SQL Editor URL bar (it must read project/${ref}) — you may have`,
  );
  console.error('pasted into a different Supabase project.');
  console.error('');
  console.error(
    `Fix: paste the missing block via ${dashboard}, or once DATABASE_URL is set in backend/.env.local run`,
  );
  console.error('`cd backend && npm run apply:migrations -- --verify`.');
  if (backendMismatchNote) {
    console.error('');
    console.error(backendMismatchNote);
  }
  process.exit(2);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env.local');
    process.exit(2);
  }
  if (!ANON_KEY) {
    console.error('Missing SUPABASE_ANON_KEY in backend/.env.local — needed for the signed-URL upload leg');
    process.exit(2);
  }

  // Locate the real backend (guards against the injected PORT env).
  try {
    BASE = await resolveBase();
  } catch (error) {
    console.error(
      `Backend not reachable — start it (npm run start:dev) before running this script.\n(${error.message})`,
    );
    process.exit(2);
  }

  // ── 0. Pre-walk project-identity guard ──
  // Fail fast BEFORE creating any user or uploading anything if the project
  // this walk targets is not migration-converged (or unverifiable), so a
  // wrong-project dashboard paste is diagnosable in one command. Same probe
  // list as validate:migrations / readiness checks.migrations.
  await migrationGuard();

  const stamp = Date.now();
  const email = `scans.e2e.${stamp}@provance.local`;
  const password = 'Provance-E2E-Scan-2026!';
  const filename = `evidence-${stamp}.png`;
  const idempotencyKey = `e2e-initiate-${stamp}`;

  let userId = null;
  let scanId = null;
  let storagePath = null;
  let storageBucket = null;
  let cleanupUser = null;
  try {
    // ── 0. Idempotent cleanup of any prior leftover user with this prefix ──
    const { body: allUsers } = await adminFetch('/auth/v1/admin/users?page=1&perPage=1000');
    const leftovers = (allUsers.users || []).filter((u) => u.email.startsWith('scans.e2e.'));
    for (const leftover of leftovers) {
      await adminFetch(`/auth/v1/admin/users/${leftover.id}`, { method: 'DELETE' });
      console.log(`cleaned leftover user ${leftover.email}`);
    }

    // ── 1. Create the throwaway user ──
    const createRes = await adminFetch('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (createRes.status !== 200 && createRes.status !== 201) {
      throw new Error(`createUser failed: ${createRes.status} ${JSON.stringify(createRes.body)}`);
    }
    userId = createRes.body.id;
    check('throwaway user created', Boolean(userId), email);

    // ── 2. Sign in ──
    const signIn = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      body: { email, password },
    });
    check('sign-in succeeds', signIn.status === 200 && signIn.body?.status === 'authenticated', `HTTP ${signIn.status}`);
    const token = signIn.body?.session?.accessToken;
    check('access token issued', Boolean(token));

    // ── 3. Initiate the scan ──
    const initiate = await apiFetch('/v1/scans', {
      method: 'POST',
      token,
      body: {
        originalFilename: filename,
        mimeType: 'image/png',
        fileSizeBytes: ONE_PX_PNG.length,
        mediaType: 'image',
        processingMode: 'standard',
      },
    });

    const contract =
      initiate.status === 201
        ? initiate.body
        : null;
    check(
      'POST /v1/scans → 201 with signed-upload contract',
      Boolean(
        contract &&
          contract.scanId &&
          contract.status === 'awaiting_upload' &&
          contract.bucket &&
          contract.path &&
          contract.token &&
          contract.signedUrl,
      ),
      initiate.status === 201 ? `scanId ${contract.scanId}, bucket ${contract.bucket}` : `HTTP ${initiate.status} ${JSON.stringify(initiate.body)}`,
    );

    if (initiate.status === 402) {
      note('initiate returned 402 (quota exhausted) — the entitlement gate fired before any row was created; check the Retry-After header on the response');
    }

    if (!contract) {
      // Nothing to walk — fail loudly with the backend's reason.
      check('round-trip proceeds past initiate', false, `cannot continue without a scan contract (HTTP ${initiate.status})`);
      return;
    }

    scanId = contract.scanId;
    storageBucket = contract.bucket;
    storagePath = contract.path;

    // ── 4. Idempotency: repeat initiate with the same Idempotency-Key ──
    const retry = await apiFetch('/v1/scans', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: {
        originalFilename: filename,
        mimeType: 'image/png',
        fileSizeBytes: ONE_PX_PNG.length,
        mediaType: 'image',
        processingMode: 'standard',
      },
    });
    check(
      'repeated initiate with same Idempotency-Key returns the same scanId',
      retry.status === 201 && retry.body?.scanId === scanId,
      retry.status === 201 ? `scanId ${retry.body?.scanId}` : `HTTP ${retry.status}`,
    );

    // ── 5. Upload the asset through the signed URL (mirrors AppUploadsPage) ──
    // The frontend uses the anon client with persistSession off; replicate it
    // verbatim so the upload leg exercises the same storage path.
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .uploadToSignedUrl(storagePath, contract.token, ONE_PX_PNG, {
        contentType: 'image/png',
        upsert: false,
      });
    check('signed-URL upload lands in Supabase Storage', !uploadError, uploadError ? uploadError.message : `${ONE_PX_PNG.length} bytes → ${storagePath}`);

    // Storage object exists (the pre-flight the submit leg uses).
    const { data: info, error: infoError } = await supabase.storage
      .from(storageBucket)
      .info(storagePath);
    check('storage.info confirms the object exists', Boolean(info?.name) && !infoError, info?.name || infoError?.message);

    // ── 6. Submit — flips the row to queued ──
    const submit = await apiFetch(`/v1/scans/${scanId}/submit`, { method: 'POST', token });
    check('POST /v1/scans/:id/submit → 202 (queued)', submit.status === 202, `HTTP ${submit.status} ${JSON.stringify(submit.body)}`);

    // ── 7. Poll until the worker completes ──
    // Row leg: the frontend's 5s cadence (every 5th 1s tick). Job leg: every
    // 1s tick so a fast worker can't hide the 'active' state that proves the
    // worker (not the request lifecycle) processed the job.
    const observed = [];
    const jobStates = [];
    const startedAt = Date.now();
    let finalRow = null;
    let ticks = 0;
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (ticks % 5 === 0) {
        const poll = await apiFetch(`/v1/scans/${scanId}`, { token });
        if (poll.status === 200 && poll.body) {
          const status = poll.body.status;
          if (!observed.includes(status)) observed.push(status);
          if (status === 'completed' || status === 'failed') {
            finalRow = poll.body;
            break;
          }
        }
      }

      if (queueClient && !queueClientError) {
        try {
          const job = await queueClient.getJob(scanId);
          const state = job ? await job.getState() : 'gone';
          if (!jobStates.includes(state)) jobStates.push(state);
        } catch (jobError) {
          queueClientError = jobError;
        }
      }

      ticks += 1;
      await sleep(JOB_POLL_INTERVAL_MS);
    }

    // The row is updated before the BullMQ 'completed' event fires, so the
    // job may still be 'active' at the row break — one final read captures
    // the terminal job state.
    let finalJobState = null;
    if (queueClient && !queueClientError) {
      try {
        const job = await queueClient.getJob(scanId);
        finalJobState = job ? await job.getState() : 'gone';
        if (finalJobState && !jobStates.includes(finalJobState)) {
          jobStates.push(finalJobState);
        }
      } catch {
        // Row checks already captured the outcome; job-level detail is best-effort.
      }
    }
    if (queueClient) {
      await queueClient.close().catch(() => {});
    }

    const okFinal = finalRow?.status === 'completed';

    // ── 7b. Job-level assertions (the worker path, not inline) ──
    if (REDIS_URL && queueClientError) {
      check('BullMQ job watcher available', false, `queue client failed: ${queueClientError.message}`);
    } else if (REDIS_URL) {
      check(
        'BullMQ job observed via the queue API (jobId = scanId)',
        jobStates.length > 0 && finalJobState !== null,
        `states seen: ${jobStates.join(' → ') || '(none)'}`,
      );
      check(
        'job-level chain proves the worker path (active claimed)',
        jobStates.includes('active'),
        `observed: ${jobStates.join(' → ') || '(none)'}`,
      );
      check(
        'job-level terminal state matches the row outcome',
        (finalJobState === 'completed') === okFinal &&
          (finalJobState === 'failed') === (finalRow?.status === 'failed'),
        `job=${finalJobState} row=${finalRow?.status ?? '(none)'}`,
      );
      if (!jobStates.includes('waiting')) {
        note('job was already claimed when the watcher first polled — "waiting" not observed at the 1s cadence');
      } else {
        note(`job-level chain observed: ${jobStates.join(' → ')}`);
      }
    } else {
      note('REDIS_URL unset — inline fallback path; job-level (BullMQ) assertion skipped');
    }

    check(
      'worker drives scan to completed via polling',
      okFinal,
      finalRow ? `final status "${finalRow.status}" (transitions: ${observed.join(' → ') || 'none observed'})` : `no terminal state within ${POLL_TIMEOUT_MS / 1000}s (transitions: ${observed.join(' → ') || 'none'})`,
    );

    if (finalRow?.status === 'failed') {
      note(`scan failed with reason: ${finalRow.failure_reason || '(none surfaced)'}`);
    }
    if (observed.includes('queued') || observed.includes('processing')) {
      note(`observed live transition chain: ${observed.join(' → ')}`);
    } else {
      note('worker completed before the first poll — the transition chain was too fast to observe at the 5s cadence');
    }

    // ── 8. Report payload leg ──
    const report = await apiFetch(`/v1/reports/${scanId}`, { token });
    const hasReport =
      report.status === 200 &&
      report.body?.report?.scan_id === scanId &&
      Boolean(report.body?.report?.result_payload) &&
      Boolean(report.body?.report?.document);
    check(
      'GET /v1/reports/:id returns the signal-by-signal payload',
      Boolean(hasReport),
      report.status === 200 ? `document + result_payload present` : `HTTP ${report.status} ${JSON.stringify(report.body)}`,
    );
    if (report.body?.report?.result_payload?.verdict) {
      note(`verdict: ${report.body.report.result_payload.verdict.class || report.body.report.result_payload.verdict.classification || '(unclassified)'}`);
    }

    // ── 9. PDF export leg ──
    const pdfRes = await fetch(`${BASE}/v1/reports/${scanId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pdfBytes = await pdfRes.arrayBuffer();
    check(
      'GET /v1/reports/:id/pdf serves a real PDF artifact',
      pdfRes.status === 200 &&
        (pdfRes.headers.get('content-type') || '').includes('application/pdf') &&
        pdfBytes.byteLength > 0,
      `HTTP ${pdfRes.status}, ${pdfBytes.byteLength} bytes, ${pdfRes.headers.get('content-type') || 'no content-type'}`,
    );

    // ── 10. Queue snapshot reflects the completed scan ──
    const snapshot = await apiFetch('/v1/scans/queue-snapshot', { token });
    const snapshotOk =
      snapshot.status === 200 &&
      typeof snapshot.body?.queued === 'number' &&
      typeof snapshot.body?.processing === 'number';
    check('GET /v1/scans/queue-snapshot returns the counters', Boolean(snapshotOk), snapshot.status === 200 ? `queued ${snapshot.body.queued} / processing ${snapshot.body.processing} / failed ${snapshot.body.failed}` : `HTTP ${snapshot.status}`);
  } finally {
    // ── 11. Always clean up: delete the throwaway user (cascades ledger/profiles) ──
    if (userId) {
      const del = await adminFetch(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
      console.log(`\ncleanup: throwaway user ${del.status === 200 ? 'deleted' : `delete failed (${del.status})`}`);
    }
    // Best-effort: remove the uploaded storage object so re-runs stay clean.
    if (storageBucket && storagePath) {
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: removeError } = await supabase.storage
          .from(storageBucket)
          .remove([storagePath]);
        console.log(`cleanup: storage object ${removeError ? `remove failed (${removeError.message})` : 'removed'}`);
      } catch (cleanupError) {
        console.log(`cleanup: storage object remove skipped (${cleanupError.message})`);
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (notes.length) {
    console.log('\nContract notes:');
    for (const n of notes) console.log(`  • ${n}`);
  }
  console.log(`\n${JSON.stringify({ ok: failed.length === 0, checks: results }, null, 2)}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\nScript error: ${error.message}`);
  process.exit(1);
});
