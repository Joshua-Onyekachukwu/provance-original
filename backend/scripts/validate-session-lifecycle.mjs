#!/usr/bin/env node
/**
 * validate-session-lifecycle.mjs — live end-to-end validation of the
 * session lifecycle against a running backend + real Supabase project.
 *
 * Walks the exact flow the Security page promises:
 *   1. Create a throwaway GoTrue user (admin API, email_confirm: true).
 *   2. Sign in twice as that user with different User-Agents (two "devices").
 *   3. GET /v1/security/sessions → both ledger rows present, `isCurrent`
 *      marked on the requester's own session.
 *   4. DELETE /v1/security/sessions/:id for device B.
 *   5. Device B's access token must now fail on GET /v1/auth/me (401);
 *      device A's token must still succeed.
 *   6. Ledger now has exactly one row (device A's).
 *
 * The throwaway user is always deleted afterwards (best-effort), so the
 * script is safe to re-run: it first purges any prior leftover user with
 * the same email prefix.
 *
 * Contract observations (cookie mode, body refresh-token stripping, whether
 * a revoked session's access token actually dies) are printed as notes so
 * mismatches are explicit, not buried.
 *
 * Usage:  node scripts/validate-session-lifecycle.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *           and the backend running on PORT (default 4000).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV = loadEnv(resolve(here, '../.env.local'));

const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE = ENV.SUPABASE_SERVICE_ROLE_KEY;
const BASE = `http://localhost:${ENV.PORT || 4000}`;

const UA_DEVICE_A =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const UA_DEVICE_B =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

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

async function apiFetch(path, { token, method = 'GET', userAgent, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userAgent ? { 'User-Agent': userAgent } : {}),
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
  return {
    status: res.status,
    body: parsedBody,
    setCookie: res.headers.getSetCookie ? res.headers.getSetCookie() : [],
  };
}

async function findUserByEmail(email) {
  const { status, body } = await adminFetch('/auth/v1/admin/users?page=1&perPage=1000');
  if (status !== 200) {
    throw new Error(`Admin user list failed: ${status} ${JSON.stringify(body)}`);
  }
  return (body.users || []).find((u) => u.email === email) || null;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env.local');
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
  const email = `sessions.e2e.${stamp}@provance.local`;
  const password = 'Provance-E2E-Session-2026!';

  let userId = null;
  try {
    // ── 0. Idempotent cleanup of any prior leftover user with this prefix ──
    const { body: allUsers } = await adminFetch('/auth/v1/admin/users?page=1&perPage=1000');
    const leftovers = (allUsers.users || []).filter((u) =>
      u.email.startsWith('sessions.e2e.'),
    );
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

    // ── 2. Two sign-ins, two devices ──
    const signInA = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      userAgent: UA_DEVICE_A,
      token: null,
      body: { email, password },
    });
    const signInB = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      userAgent: UA_DEVICE_B,
      token: null,
      body: { email, password },
    });

    const okSignIn = (r) => r.status === 200 && r.body?.status === 'authenticated';
    check('sign-in device A (Chrome/macOS)', okSignIn(signInA), `HTTP ${signInA.status}`);
    check('sign-in device B (Safari/iPhone)', okSignIn(signInB), `HTTP ${signInB.status}`);

    const tokenA = signInA.body?.session?.accessToken;
    const tokenB = signInB.body?.session?.accessToken;
    check('access tokens issued for both devices', Boolean(tokenA && tokenB));

    // Contract note: refresh-token transport mode.
    const cookieMode =
      signInA.setCookie.some((c) => /refresh/i.test(c)) &&
      !signInA.body?.session?.refreshToken;
    if (cookieMode) {
      note(
        'refresh token travels via Set-Cookie only (AUTH_COOKIE_ENABLED=true default); body refreshToken stripped',
      );
    } else if (signInA.body?.session?.refreshToken) {
      note('refresh token returned in the response body (cookies disabled)');
    } else {
      note('neither cookie nor body refresh token observed — check AUTH_COOKIE_ENABLED');
    }

    // ── 3. Ledger shows both rows ──
    const list1 = await apiFetch('/v1/security/sessions', { token: tokenA });
    check('GET /v1/security/sessions lists 2 rows', list1.status === 200 && Array.isArray(list1.body) && list1.body.length === 2, `HTTP ${list1.status}, ${list1.body?.length} rows`);

    const list1Rows = Array.isArray(list1.body) ? list1.body : [];
    const rowA = list1Rows.find((r) => (r.device || '').includes('Chrome'));
    const rowB = list1Rows.find((r) => (r.device || '').includes('Safari'));
    check(
      'device labels derived from User-Agent',
      Boolean(rowA && rowB),
      `"${rowA?.device}" / "${rowB?.device}"`,
    );
    check(
      'isCurrent marked on the requester’s own session',
      rowA?.isCurrent === true && rowB?.isCurrent === false,
    );

    // ── 4. Revoke device B ──
    const revoke = rowB
      ? await apiFetch(`/v1/security/sessions/${rowB.id}`, {
          method: 'DELETE',
          token: tokenA,
        })
      : null;
    check(
      'DELETE /v1/security/sessions/:id revokes device B',
      revoke?.status === 200 && revoke?.body?.ok === true,
      revoke ? `HTTP ${revoke.status}` : 'skipped — no device-B row to revoke',
    );

    // ── 5. Ledger now has one row ──
    const list2 = await apiFetch('/v1/security/sessions', { token: tokenA });
    check(
      'ledger drops to 1 row after revocation',
      list2.status === 200 && Array.isArray(list2.body) && list2.body.length === 1,
      `${list2.body?.length} row(s)`,
    );

    // ── 6. Revoked token stops working; survivor keeps working ──
    const meB = await apiFetch('/v1/auth/me', { token: tokenB });
    if (revoke?.status === 200) {
      check('device B token rejected after revocation (401)', meB.status === 401, `HTTP ${meB.status}`);
    } else {
      check(
        'device B token rejected after revocation (401)',
        false,
        'revocation did not complete — no ledger row (see earlier failure)',
      );
    }
    const meA = await apiFetch('/v1/auth/me', { token: tokenA });
    check('device A token still valid (200)', meA.status === 200, `HTTP ${meA.status}`);

    if (revoke?.status === 200) {
      if (meB.status === 200) {
        note('CONTRACT MISMATCH: a revoked session’s access token still validates via /auth/me — revocation only killed the refresh token');
      } else {
        note('revocation killed the access token too — GoTrue /auth/v1/user rejects the dead session’s JWT');
      }
    }
  } finally {
    // ── 7. Always delete the throwaway user (cascades ledger rows) ──
    if (userId) {
      const del = await adminFetch(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
      console.log(`\ncleanup: throwaway user ${del.status === 200 ? 'deleted' : `delete failed (${del.status})`}`);
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
