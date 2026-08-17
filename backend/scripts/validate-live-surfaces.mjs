#!/usr/bin/env node
/**
 * validate-live-surfaces.mjs — live validation of the notifications and
 * admin analytics surfaces against a running backend + real Supabase project.
 *
 * Walks the two surfaces the frontend consumes that were 503/404 in real mode
 * while migrations were pending:
 *   1. Pre-flight: backend health + direct probes for the exact schema gates
 *      each surface depends on — the notifications table (0011) and
 *      scans.processing_mode (0009, the admin analytics gate). Exits with the
 *      actionable missing-list (same non-head REST probe pattern as
 *      validate-migrations.mjs) if either is absent.
 *   2. Sign in as an ADMIN_EMAILS-allowlisted account (defaults to the
 *      seed-org.ts fixture founder.admin@provance.local; overridable via
 *      ADMIN_WALK_EMAIL / ADMIN_WALK_PASSWORD). Creates the account via the
 *      GoTrue admin API when it doesn't exist yet.
 *   3. Notifications leg:
 *        - GET /v1/notifications?page=1&pageSize=20 → the paginated envelope
 *          { data, total, page, pageSize } the bell + notifications page use
 *        - GET /v1/notifications/unread-count → the badge counter
 *        - rows carry the mock-parity fields (id, category, title, read,
 *          link, created_at)
 *   4. Admin analytics leg: GET /v1/admin/analytics compared field-by-field
 *      against mockAnalytics (the shape the Analytics page renders), with the
 *      parity-monitoring classification — HARD (missing keys / wrong element
 *      shapes / non-ISO dates / non-numeric counts) fails the walk, SOFT
 *      (value-level differences like zero live counts, fewer buckets) is
 *      reported but is data-driven, not a contract break.
 *
 * Usage:  node scripts/validate-live-surfaces.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *           migrations 0009 + 0011 applied to that project, and the backend
 *           running on PORT (default 4000).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockAnalytics } from '../../src/lib/mockData.js';

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

/**
 * Migration probes (same non-head REST pattern as validate-migrations.mjs —
 * head:true masks PGRST205). notifications must resolve (0011);
 * scans.processing_mode must resolve (0009, the analytics gate).
 * Returns the list of missing migration ids.
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

  const notif = await probe(
    `${SUPABASE_URL}/rest/v1/notifications?select=id&limit=1`,
  );
  if (notif !== 200) missing.push('0011');

  const scansCol = await probe(
    `${SUPABASE_URL}/rest/v1/scans?select=processing_mode&limit=1`,
  );
  if (scansCol !== 200) missing.push('0009');

  return missing;
}

/**
 * Field-by-field shape parity between the live analytics payload and
 * mockAnalytics. Returns { hard, soft } where hard is a list of structural
 * breaks (missing keys, wrong shapes) and soft is value-level drift the page
 * renders honestly.
 */
function compareAnalytics(mock, real) {
  const hard = [];
  const soft = [];

  const typeOf = (value) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return `array[${value.length}]`;
    return typeof value;
  };

  const walk = (section, mockValue, realValue) => {
    if (realValue === undefined) {
      hard.push(`${section}: MISSING in real`);
      return;
    }
    if (mockValue === null || realValue === null) {
      if (mockValue !== realValue) {
        soft.push(`${section}: mock=${typeOf(mockValue)} real=${typeOf(realValue)}`);
      }
      return;
    }
    if (typeof mockValue === 'object' && !Array.isArray(mockValue)) {
      for (const key of Object.keys(mockValue)) {
        walk(`${section}.${key}`, mockValue[key], realValue[key]);
      }
      return;
    }
    if (Array.isArray(mockValue)) {
      if (!Array.isArray(realValue)) {
        hard.push(`${section}: mock array, real ${typeOf(realValue)}`);
        return;
      }
      if (realValue.length !== mockValue.length) {
        soft.push(`${section}: mock ${mockValue.length} rows, real ${realValue.length}`);
      }
      if (realValue.length > 0 && mockValue.length > 0) {
        for (const key of Object.keys(mockValue[0])) {
          if (!(key in realValue[0])) {
            hard.push(`${section}[].${key}: missing in real elements`);
          }
        }
        // Element-level contract: ISO date keys must parse (the charts render
        // these into time axes — a non-ISO value is a structural break).
        if ('date' in mockValue[0]) {
          if (Number.isNaN(Date.parse(realValue[0].date))) {
            hard.push(`${section}[].date: non-ISO date "${realValue[0].date}"`);
          }
        }
      }
      return;
    }
    // Scalar — must share a numeric/string type; exact values are data-driven.
    if (typeof realValue !== typeof mockValue) {
      hard.push(`${section}: mock ${typeOf(mockValue)}, real ${typeOf(realValue)}`);
    }
  };

  for (const key of Object.keys(mock)) {
    walk(key, mock[key], real[key]);
  }
  return { hard, soft };
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
      'The notifications leg needs the notifications table (0011); admin analytics needs scans.processing_mode (0009).',
    );
    console.error(
      'Paste .freebuff/combined-0005-0020.sql into the SQL Editor of this project, wait a few seconds, then re-run.',
    );
    process.exit(2);
  }
  check('migrations 0009 + 0011 applied (scans.processing_mode + notifications)', true);

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

    // ── 2. Notifications leg ────────────────────────────────────────────────
    const list = await apiFetch('/v1/notifications?page=1&pageSize=20', { token });
    const notifRows = list.body?.data ?? [];
    check(
      'GET /v1/notifications returns the paginated envelope',
      list.status === 200 &&
        Array.isArray(notifRows) &&
        typeof list.body?.total === 'number' &&
        list.body?.page === 1 &&
        list.body?.pageSize === 20,
      `HTTP ${list.status}, ${list.body?.total ?? '?'} total, ${notifRows.length} on page 1`,
    );
    if (list.status === 200 && notifRows.length > 0) {
      const first = notifRows[0];
      const rowContract =
        typeof first?.id === 'string' &&
        typeof first?.title === 'string' &&
        typeof first?.category === 'string' &&
        typeof first?.read === 'boolean' &&
        'link' in first &&
        !Number.isNaN(Date.parse(first?.created_at));
      check(
        'notification rows carry the mock-parity fields (id/title/category/read/link/created_at)',
        Boolean(rowContract),
        rowContract ? `${notifRows.length} rows, newest first` : JSON.stringify(first).slice(0, 140),
      );
    } else if (list.status === 200) {
      note('notifications table is empty — the envelope is correct, zero rows to shape-check');
    }

    const unread = await apiFetch('/v1/notifications/unread-count', { token });
    check(
      'GET /v1/notifications/unread-count returns the badge counter',
      unread.status === 200 && typeof unread.body?.count === 'number',
      `HTTP ${unread.status}${unread.status === 200 ? `, ${unread.body.count} unread` : ''}`,
    );

    // ── 3. Admin analytics leg (parity against mockAnalytics) ───────────────
    const analytics = await apiFetch('/v1/admin/analytics', { token });
    check(
      'GET /v1/admin/analytics returns 200',
      analytics.status === 200 && typeof analytics.body === 'object',
      `HTTP ${analytics.status}`,
    );
    if (analytics.status === 200 && analytics.body) {
      const { hard, soft } = compareAnalytics(mockAnalytics, analytics.body);
      for (const h of hard) console.log(`  ✗ HARD ${h}`);
      for (const s of soft) console.log(`  ~ SOFT ${s}`);
      check(
        'analytics payload matches mockAnalytics shape (no HARD drift)',
        hard.length === 0,
        hard.length ? `${hard.length} structural breaks` : `${soft.length} soft value diffs (data-driven)`,
      );
      if (soft.length) note(`analytics soft diffs: ${soft.join('; ')}`);
    }
  } finally {
    if (ADMIN_EMAIL.startsWith('founder.admin')) {
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
