#!/usr/bin/env node
/**
 * validate-admin-jobs.mjs — live validation of the real /admin/jobs surface
 * against a running backend + real Supabase project.
 *
 * Walks the flow the Admin Jobs page promises once migrations 0008
 * (audit_logs) and 0009 (scan processing columns) are applied:
 *   1. Pre-flight: backend health + direct probes for the audit_logs table
 *      and scans.processing_mode column (the exact gates listJobs/retry and
 *      the audit trail depend on). Exits with the actionable missing-list if
 *      either migration is absent.
 *   2. Sign in as an ADMIN_EMAILS-allowlisted account (defaults to the
 *      seed-org.ts fixture founder.admin@provance.local; overridable via
 *      ADMIN_WALK_EMAIL / ADMIN_WALK_PASSWORD). Creates the account via the
 *      GoTrue admin API when it doesn't exist yet (the documented seed
 *      pattern) and reports clearly if it exists with an unknown password.
 *   3. Seed one synthetic 'failed' scan row (service-role insert) so the
 *      ledger has deterministic content — then:
 *        - GET /v1/admin/jobs (no params) → envelope + the seeded row
 *        - GET /v1/admin/jobs?status=failed → every row failed, row present
 *        - pagination: ?status=failed&page=1|2&pageSize=1 → disjoint pages,
 *          exact total preserved
 *        - POST /v1/admin/jobs/:id/retry → { ok, job.status: 'queued' } and
 *          the row now shows under ?status=queued (DB 'queued' dialect)
 *        - GET /v1/admin/audit-logs?actor=<email>&action=scan.retried → the
 *          audit row with the right actor, severity 'medium', entity_id =
 *          the retried scan id (also findable via ?search=<scanId>)
 *   4. Cleanup: the synthetic scan row is deleted (best-effort); the audit
 *      rows are intentionally left — they are the point of the walk.
 *
 * Usage:  node scripts/validate-admin-jobs.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *           migrations 0008 + 0009 applied to that project, and the backend
 *           running on PORT (default 4000).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const ENV = loadEnv(resolve(here, '../.env.local'));

const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE = ENV.SUPABASE_SERVICE_ROLE_KEY;

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

// The documented seed-org.ts admin fixture; override when the live project's
// admin account uses a different password.
const ADMIN_EMAIL = process.env.ADMIN_WALK_EMAIL ?? 'founder.admin@provance.local';
const ADMIN_PASSWORD =
  process.env.ADMIN_WALK_PASSWORD ?? 'provance-seed-pass-123';

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
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[trimmed.slice(0, eq).trim()] = value;
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

function jwtSub(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    );
    return payload?.sub || null;
  } catch {
    return null;
  }
}

/**
 * Migration probes (same non-head REST pattern as validate-migrations.mjs —
 * head:true masks PGRST205). audit_logs must resolve; scans.processing_mode
 * must resolve (0009). Returns the list of missing migration ids.
 */
async function probeMissingMigrations() {
  const missing = [];
  const probe = async (url) => {
    try {
      const res = await fetch(url, {
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      return res.status;
    } catch {
      return 0;
    }
  };

  const audit = await probe(
    `${SUPABASE_URL}/rest/v1/audit_logs?select=id&limit=1`,
  );
  if (audit !== 200) missing.push('0008');

  const scansCol = await probe(
    `${SUPABASE_URL}/rest/v1/scans?select=processing_mode&limit=1`,
  );
  if (scansCol !== 200) missing.push('0009');

  return missing;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env.local');
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
  check('backend reachable', true, BASE);

  // ── 0. Migration pre-flight ───────────────────────────────────────────────
  const missing = await probeMissingMigrations();
  if (missing.length > 0) {
    console.error(
      `\nBLOCKED: migrations ${missing.join(' + ')} not applied to ${new URL(SUPABASE_URL).hostname}.`,
    );
    console.error(
      'The /admin/jobs walk needs audit_logs (0008) and scans.processing_mode (0009).',
    );
    console.error(
      'Paste .freebuff/combined-0005-0020.sql into the SQL Editor of this project, wait a few seconds, then re-run.',
    );
    process.exit(2);
  }
  check('migrations 0008 + 0009 applied (audit_logs + scans.processing_mode)', true);

  let adminUserId = null;
  let scanId = null;

  try {
    // ── 1. Sign in as the allowlisted admin ─────────────────────────────────
    let signIn = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    if (signIn.status === 401) {
      // Account doesn't exist yet (or wrong password). Try creating it the
      // documented seed way — email_confirm: true, same dev password.
      const createRes = await adminFetch('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
        }),
      });
      if (createRes.status === 200 || createRes.status === 201) {
        note(
          `admin account ${ADMIN_EMAIL} did not exist — created it via the GoTrue admin API (seed pattern).`,
        );
        signIn = await apiFetch('/v1/auth/sign-in', {
          method: 'POST',
          body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        });
      } else if (createRes.status === 422) {
        throw new Error(
          `admin account ${ADMIN_EMAIL} already exists with a different password — set ADMIN_WALK_PASSWORD or reset it in the Supabase dashboard`,
        );
      } else {
        throw new Error(
          `admin account create failed: ${createRes.status} ${JSON.stringify(createRes.body)}`,
        );
      }
    }

    check(
      'admin sign-in succeeds',
      signIn.status === 200 && signIn.body?.status === 'authenticated',
      `HTTP ${signIn.status}`,
    );
    const token = signIn.body?.session?.accessToken;
    check('admin access token issued', Boolean(token));
    adminUserId = token ? jwtSub(token) : null;
    check('admin user id decoded from token', Boolean(adminUserId), adminUserId ?? 'n/a');

    // ── 2. Seed one synthetic failed scan for deterministic retry ───────────
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const stamp = Date.now();
    const { data: seeded, error: seedError } = await supabase
      .from('scans')
      .insert({
        user_id: adminUserId,
        status: 'failed',
        original_filename: `admin-walk-evidence-${stamp}.png`,
        mime_type: 'image/png',
        file_size_bytes: 2048,
        storage_bucket: 'evidence',
        storage_path: `seeded/admin-jobs-walk-${stamp}.png`,
        failure_reason: 'Seeded by validate-admin-jobs.mjs for the retry walk',
      })
      .select('id,status')
      .single();
    check(
      'seeded a synthetic failed scan row',
      !seedError && seeded?.id,
      seedError ? seedError.message : seeded?.id,
    );
    scanId = seeded?.id ?? null;

    if (scanId) {
      // ── 3. List + filter + paginate the ledger ────────────────────────────
      const all = await apiFetch('/v1/admin/jobs', { token });
      check(
        'GET /v1/admin/jobs returns the envelope',
        all.status === 200 && Array.isArray(all.body?.data),
        `HTTP ${all.status}, ${all.body?.total ?? '?'} total`,
      );
      check(
        'seeded row visible in the full ledger',
        (all.body?.data ?? []).some((job) => job.id === scanId),
      );

      const failed = await apiFetch('/v1/admin/jobs?status=failed', { token });
      const failedRows = failed.body?.data ?? [];
      check(
        '?status=failed filters server-side (every row failed, exact total)',
        failed.status === 200 &&
          failedRows.every((job) => job.status === 'failed') &&
          failedRows.some((job) => job.id === scanId),
        `HTTP ${failed.status}, ${failed.body?.total ?? '?'} failed`,
      );

      const p1 = await apiFetch('/v1/admin/jobs?status=failed&page=1&pageSize=1', { token });
      const p2 = await apiFetch('/v1/admin/jobs?status=failed&page=2&pageSize=1', { token });
      const p1Ids = (p1.body?.data ?? []).map((job) => job.id);
      const p2Ids = (p2.body?.data ?? []).map((job) => job.id);
      check(
        'pagination: pageSize=1 yields disjoint pages with the exact total',
        p1.status === 200 &&
          p2.status === 200 &&
          p1.body?.pageSize === 1 &&
          p2.body?.pageSize === 1 &&
          p1Ids.length === 1 &&
          p2Ids.length === 1 &&
          p1Ids[0] !== p2Ids[0] &&
          p1.body?.total === p2.body?.total &&
          p1.body?.total >= 1,
        `HTTP ${p1.status}/${p2.status}, total ${p1.body?.total ?? '?'}`,
      );

      // ── 4. Retry the failed scan ──────────────────────────────────────────
      const retry = await apiFetch(`/v1/admin/jobs/${scanId}/retry`, {
        method: 'POST',
        token,
      });
      check(
        'POST /v1/admin/jobs/:id/retry re-queues the job',
        retry.status === 200 && retry.body?.ok === true && retry.body?.job?.status === 'queued',
        `HTTP ${retry.status}, status ${retry.body?.job?.status ?? '?'}`,
      );

      const queued = await apiFetch('/v1/admin/jobs?status=queued', { token });
      check(
        'retried row now appears under ?status=queued',
        (queued.body?.data ?? []).some((job) => job.id === scanId),
      );

      // ── 5. Audit trail: scan.retried with the right actor ─────────────────
      const auditUrl = `/v1/admin/audit-logs?actor=${encodeURIComponent(ADMIN_EMAIL)}&action=scan.retried&pageSize=10`;
      const audit = await apiFetch(auditUrl, { token });
      const scanRetriedRows = (audit.body?.data ?? []).filter(
        (row) => row.entity_id === scanId,
      );
      const auditRow = scanRetriedRows[0];
      check(
        'GET /v1/admin/audit-logs shows scan.retried for this scan',
        audit.status === 200 && Boolean(auditRow),
        scanRetriedRows.length
          ? `${scanRetriedRows.length} row(s)`
          : `HTTP ${audit.status}, none matched`,
      );
      if (auditRow) {
        check(
          'audit row carries the admin actor + severity',
          auditRow.actor_email === ADMIN_EMAIL && auditRow.action === 'scan.retried',
          `actor ${auditRow.actor_email}, action ${auditRow.action}`,
        );
        check(
          'audit severity is medium (shared action map)',
          auditRow.severity === 'medium',
          auditRow.severity,
        );
      }

      // Bonus: the free-text search finds the same row.
      const bySearch = await apiFetch(
        `/v1/admin/audit-logs?search=${scanId}&pageSize=10`,
        { token },
      );
      check(
        '?search=<scanId> also surfaces the audit row',
        (bySearch.body?.data ?? []).some((row) => row.entity_id === scanId),
      );
    }
  } finally {
    // ── 6. Cleanup: remove the synthetic scan row (audit rows stay) ─────────
    if (scanId) {
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: removeError } = await supabase
          .from('scans')
          .delete()
          .eq('id', scanId);
        console.log(
          `\ncleanup: synthetic scan ${removeError ? `remove failed (${removeError.message})` : 'removed'}`,
        );
      } catch (cleanupError) {
        console.log(`\ncleanup: synthetic scan remove skipped (${cleanupError.message})`);
      }
    }
    if (adminUserId && ADMIN_EMAIL.startsWith('founder.admin')) {
      // The seed admin account is intentionally left in place — deleting it
      // would break the documented dev account. Only note it.
      note('admin account left in place (documented seed account)');
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
