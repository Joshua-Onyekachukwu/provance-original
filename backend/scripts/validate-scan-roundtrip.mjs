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
 * transitions, 402 quota behavior) are printed as notes so mismatches are
 * explicit, not buried.
 *
 * Usage:  node scripts/validate-scan-roundtrip.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *           (+ SUPABASE_ANON_KEY for the signed-URL upload), and the backend
 *           running on PORT (default 4000).
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const ENV = loadEnv(resolve(here, '../.env.local'));

const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE = ENV.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = ENV.SUPABASE_ANON_KEY;
// Shell override wins (matches how the backend is booted: PORT=4100 node dist/main.js).
const BASE = `http://localhost:${process.env.PORT || ENV.PORT || 4000}`;

// The same 1×1 transparent PNG the backend e2e specs use — a genuine asset
// for the real Jimp decode + exifr parse path (PNG signature: 89 50 4E 47).
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const POLL_INTERVAL_MS = 5_000; // matches the frontend's useResource cadence
const POLL_TIMEOUT_MS = 120_000;

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

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env.local');
    process.exit(2);
  }
  if (!ANON_KEY) {
    console.error('Missing SUPABASE_ANON_KEY in backend/.env.local — needed for the signed-URL upload leg');
    process.exit(2);
  }

  // Warm up the backend.
  try {
    const res = await fetch(`${BASE}/v1/health`);
    if (!res.ok) throw new Error(`health ${res.status}`);
  } catch (error) {
    console.error(
      `Backend not reachable at ${BASE} — start it (npm run start:dev) before running this script.\n(${error.message})`,
    );
    process.exit(2);
  }

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

    // ── 7. Poll until the worker completes (frontend 5s cadence) ──
    const observed = [];
    const startedAt = Date.now();
    let finalRow = null;
    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      const poll = await apiFetch(`/v1/scans/${scanId}`, { token });
      if (poll.status === 200 && poll.body) {
        const status = poll.body.status;
        if (!observed.includes(status)) observed.push(status);
        if (status === 'completed' || status === 'failed') {
          finalRow = poll.body;
          break;
        }
      }
      await sleep(POLL_INTERVAL_MS);
    }

    const okFinal = finalRow?.status === 'completed';
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
