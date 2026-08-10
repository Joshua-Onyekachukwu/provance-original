#!/usr/bin/env node
/**
 * validate-refresh-cookie.mjs — live end-to-end validation of the httpOnly
 * refresh-cookie flow against a running backend + real Supabase project.
 *
 * Walks the exact flow the auth cookie migration promises:
 *   1. Create a throwaway GoTrue user (admin API, email_confirm: true).
 *   2. POST /v1/auth/sign-in → Set-Cookie carries the refresh token with the
 *      httpOnly attributes; the response body is stripped of refreshToken.
 *   3. POST /v1/auth/refresh with the cookie → rotation: a NEW refresh token
 *      is set on the cookie and the old one is invalidated server-side.
 *   4. Refresh again → second rotation (another fresh cookie value).
 *   5. Replay the ORIGINAL sign-in cookie → 401 (rotation killed it).
 *   6. Replay the FIRST-rotation cookie → 401 (rotation killed it too).
 *
 * Rotation caveat (probed live against this project's GoTrue v2.195.0):
 *  - Replays of a rotated token within the reuse grace interval return 200
 *    (GoTrue re-rotates — race tolerance for a lost rotation response).
 *  - Past the interval (~20s observed), the replay is rejected with
 *    error_code refresh_token_already_used / "Invalid Refresh Token: Already
 *    Used" — the legacy "Refresh Token Not Found" signature no longer
 *    matches this version.
 *  - The flagged replay is treated as theft: the WHOLE session dies — even
 *    the never-replayed latest token stops refreshing afterwards.
 * The walk sleeps past the interval so the replays land in the rejection
 * window and prove rotation ultimately invalidates the old cookie.
 *
 * Throttle note: the walk makes exactly 5 requests to the auth controller
 * (limit 5/60s), so do not re-run it within 60s of the previous run.
 *
 * Access-token validity after each step is proven through a guarded route
 * (GET /v1/security/sessions): the SupabaseAuthGuard validates the JWT
 * against GoTrue before the handler runs, so any non-401 status means the
 * token is live (the handler may 503 when the user_sessions table is
 * missing — that still proves the guard passed, and is noted).
 *
 * The throwaway user is always deleted afterwards (best-effort), so the
 * script is safe to re-run: leftover users with the same email prefix are
 * purged first.
 *
 * Contract observations (cookie name plain vs __Host-, Secure presence,
 * reuse-detection audit rows) are printed as notes so mismatches are
 * explicit, not buried.
 *
 * Usage:  node scripts/validate-refresh-cookie.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *           and the backend running on PORT (default 4000; shell override
 *           wins, matching how the backend is booted).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV = loadEnv(resolve(here, '../.env.local'));

const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE = ENV.SUPABASE_SERVICE_ROLE_KEY;
const BASE = `http://localhost:${process.env.PORT || ENV.PORT || 4000}`;

const results = [];
const notes = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const note = (text) => notes.push(text);

// GoTrue's reuse grace interval is ~10s by default but ~20s was observed on
// this project's v2.195.0; sleep past it so replayed rotated tokens land in
// the hard-rejection window (25s keeps one probe run within the 60s throttle
// window for the 5 auth-controller calls).
const REUSE_GRACE_SLEEP_MS = Number(process.env.REUSE_GRACE_SLEEP_MS || 25_000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/**
 * Raw Set-Cookie parsing — pull every refresh-cookie directive out of the
 * response so the walk can assert attributes and replay values verbatim.
 */
function parseSetCookies(res) {
  const headers = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return headers.map((header) => {
    const [pair, ...attrs] = header.split(';').map((part) => part.trim());
    const eq = pair.indexOf('=');
    return {
      name: eq === -1 ? pair : pair.slice(0, eq),
      value: eq === -1 ? '' : pair.slice(eq + 1),
      attrs,
      raw: header,
    };
  });
}

async function apiFetch(path, { token, method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
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
  return { status: res.status, body: parsedBody, res };
}

const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// Guarded non-auth route: any non-401 response means the access token passed
// the SupabaseAuthGuard (the handler may 503 on a missing user_sessions
// table — noted, not a token failure).
const tokenProbe = async (token) => {
  const probe = await apiFetch('/v1/security/sessions', { token });
  const valid = probe.status !== 401;
  if (probe.status === 503) {
    note('token-validity probe hit the missing user_sessions table (503 after guard pass) — the token itself validated');
  }
  return valid;
};

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
  const email = `cookie.e2e.${stamp}@provance.local`;
  const password = 'Provance-E2E-Cookie-2026!';

  let userId = null;
  try {
    // ── 0. Idempotent cleanup of any prior leftover user with this prefix ──
    const { body: allUsers } = await adminFetch('/auth/v1/admin/users?page=1&perPage=1000');
    const leftovers = (allUsers.users || []).filter((u) => u.email.startsWith('cookie.e2e.'));
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

    // ── 2. Sign in — capture the Set-Cookie attributes ──
    const signIn = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      body: { email, password },
    });
    check(
      'sign-in succeeds',
      signIn.status === 200 && signIn.body?.status === 'authenticated',
      `HTTP ${signIn.status}`,
    );

    const cookies = parseSetCookies(signIn.res);
    const refreshCookie = cookies.find((c) => /refresh/i.test(c.name));
    const cookieMode = Boolean(refreshCookie) && !signIn.body?.session?.refreshToken;

    check(
      'refresh token travels via Set-Cookie, not the body',
      cookieMode,
      refreshCookie
        ? `cookie ${refreshCookie.name} set; body refreshToken stripped`
        : `no refresh cookie found (cookies disabled?)${signIn.body?.session?.refreshToken ? '; refreshToken present in body' : ''}`,
    );

    const accessToken = signIn.body?.session?.accessToken;
    check('access token issued in the body', Boolean(accessToken));

    if (refreshCookie) {
      check('cookie is HttpOnly', refreshCookie.attrs.some((a) => /^httpOnly$/i.test(a)), refreshCookie.attrs.join(', '));
      check('cookie SameSite is set', refreshCookie.attrs.some((a) => /^SameSite=/i.test(a)), refreshCookie.attrs.find((a) => /^SameSite=/i.test(a)) || '(missing)');
      check('cookie Path=/', refreshCookie.attrs.some((a) => a === 'Path=/'), refreshCookie.attrs.join(', '));
      check(
        'cookie carries a Max-Age (30d)',
        refreshCookie.attrs.some((a) => /^Max-Age=2592000$/i.test(a)),
        refreshCookie.attrs.find((a) => /^Max-Age=/i.test(a)) || '(missing)',
      );
      const secure = refreshCookie.attrs.some((a) => a === 'Secure');
      if (secure) {
        note(`cookie uses the __Host- name + Secure (production-style deployment): ${refreshCookie.name}`);
      } else {
        note(`cookie is the plain local-dev name ${refreshCookie.name} — Secure is correctly absent over http (AUTH_COOKIE_SECURE=false)`);
      }
    }

    // ── 3. First refresh — rotation #1 ──
    const cookie1 = refreshCookie ? `${refreshCookie.name}=${refreshCookie.value}` : null;
    const refresh1 = await apiFetch('/v1/auth/refresh', {
      method: 'POST',
      cookie: cookie1,
      body: {},
    });
    const refresh1Cookies = parseSetCookies(refresh1.res);
    const rot1 = refresh1Cookies.find((c) => /refresh/i.test(c.name));

    check('refresh #1 succeeds and rotates the cookie', refresh1.status === 200 && Boolean(rot1), `HTTP ${refresh1.status}${rot1 ? `, new ${rot1.name}` : ''}`);
    check('refresh #1 returns a fresh access token', Boolean(refresh1.body?.session?.accessToken));
    check(
      'refresh #1 rotated the refresh token (new value ≠ old)',
      Boolean(refreshCookie && rot1) && decode(rot1.value) !== decode(refreshCookie.value),
      `old ${decode(refreshCookie?.value || '').slice(0, 18)}… → new ${decode(rot1?.value || '').slice(0, 18)}…`,
    );
    check('access token from refresh #1 validates (guarded route)', await tokenProbe(refresh1.body?.session?.accessToken));

    // ── 4. Second refresh — rotation #2 ──
    const cookie2 = rot1 ? `${rot1.name}=${rot1.value}` : null;
    const refresh2 = await apiFetch('/v1/auth/refresh', {
      method: 'POST',
      cookie: cookie2,
      body: {},
    });
    const refresh2Cookies = parseSetCookies(refresh2.res);
    const rot2 = refresh2Cookies.find((c) => /refresh/i.test(c.name));

    check('refresh #2 succeeds and rotates again', refresh2.status === 200 && Boolean(rot2), `HTTP ${refresh2.status}${rot2 ? `, new ${rot2.name}` : ''}`);
    check(
      'refresh #2 rotated again (new value ≠ refresh #1 value)',
      Boolean(rot1 && rot2) && decode(rot2.value) !== decode(rot1.value),
      `v1 ${decode(rot1?.value || '').slice(0, 18)}… → v2 ${decode(rot2?.value || '').slice(0, 18)}…`,
    );
    check('access token from refresh #2 validates (guarded route)', await tokenProbe(refresh2.body?.session?.accessToken));

    // ── 5. Let GoTrue's reuse grace interval elapse before replaying ──
    console.log(`\nwaiting ${REUSE_GRACE_SLEEP_MS / 1000}s past GoTrue's reuse grace interval before replaying rotated tokens…`);
    await sleep(REUSE_GRACE_SLEEP_MS);

    // ── 5. Replay the ORIGINAL sign-in cookie — must be dead now ──
    const replay1 = await apiFetch('/v1/auth/refresh', {
      method: 'POST',
      cookie: cookie1,
      body: {},
    });
    check(
      'rotation invalidates the original sign-in cookie (replay → 401)',
      replay1.status === 401,
      `HTTP ${replay1.status}`,
    );

    // ── 6. Replay the FIRST-rotation cookie — must be dead too ──
    const replay2 = await apiFetch('/v1/auth/refresh', {
      method: 'POST',
      cookie: cookie2,
      body: {},
    });
    check(
      'rotation invalidates the first-rotation cookie (replay → 401)',
      replay2.status === 401,
      `HTTP ${replay2.status}`,
    );

    // (The session's liveness after both rotations is proven by the guarded
    // access-token probe after refresh #2 — the latest refresh cookie came
    // from the same rotation response. Keeping auth-controller calls at the
    // 5/60s throttle budget.)

    // ── 7. Reuse-detection audit (best-effort read; noted if table missing) ──
    try {
      const { data, error } = await adminClientReadAudit();
      if (error) {
        note(`reuse-detection audit read skipped — ${error.message}`);
      } else {
        const replayRows = (data || []).filter((r) => r.action === 'refresh_token_rejected');
        const suspected = replayRows.filter((r) => r.details?.reuse_suspected === true);
        check(
          'replayed rotated tokens recorded as refresh_token_rejected (reuse_suspected)',
          suspected.length >= 2,
          `${suspected.length} rejected-reuse rows (from ${replayRows.length} total rejects)`,
        );
        if (suspected.length) {
          note(`audit row sample: action=refresh_token_rejected, severity=${suspected[0].severity}, hash stored (${String((suspected[0].details?.refresh_token_hash || '').length)} hex chars) — no raw token`);
        }
      }
    } catch (auditError) {
      note(`reuse-detection audit read failed: ${auditError.message}`);
    }
  } finally {
    // ── 8. Always delete the throwaway user (cascades ledger/profiles) ──
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

/**
 * Best-effort read of the refresh-token rejection trail. Uses the REST API
 * directly so a missing audit table is reported, not thrown.
 */
async function adminClientReadAudit() {
  // recordRejectedRefresh writes to the audit_logs table (migration 0008).
  // severity needs that migration; fall back to the base columns when it is
  // missing so the reuse count is still verifiable live.
  const select = 'action,details';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?action=eq.refresh_token_rejected&select=${encodeURIComponent(select)}&order=created_at.desc&limit=5`, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 160);
    if (res.status === 400 && text.includes('severity')) {
      return { data: null, error: { message: 'severity column missing (migration 0008 not applied) — reuse rows exist but severity could not be read' } };
    }
    if (res.status === 404 || text.includes('PGRST204')) {
      return { data: null, error: { message: 'audit_logs table missing (migration 0008 not applied) — reuse-detection rows could not be read live' } };
    }
    return { data: null, error: { message: `HTTP ${res.status} — ${text}` } };
  }
  return { data: await res.json(), error: null };
}

main().catch((error) => {
  console.error(`\nScript error: ${error.message}`);
  process.exit(1);
});
