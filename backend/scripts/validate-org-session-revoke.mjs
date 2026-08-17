#!/usr/bin/env node
/**
 * validate-org-session-revoke.mjs — live org-admin session-revocation walk
 * against a running backend + real Supabase project.
 *
 * Walks the exact flow the Organization page's member-sessions drawer
 * promises (once migrations 0005 organizations + 0010 user_sessions are
 * applied):
 *   1. Pre-flight: backend health + direct probes for the organizations
 *      table (0005) and user_sessions table (0010) — exits with the
 *      actionable hint if either is missing.
 *   2. Sign in as the ADMIN_EMAILS-allowlisted org admin (defaults to the
 *      seed-org.ts fixture founder.admin@provance.local; overridable via
 *      ADMIN_WALK_EMAIL / ADMIN_WALK_PASSWORD; created via the GoTrue admin
 *      API when missing).
 *   3. Create a throwaway MEMBER user, sign it in twice with different
 *      User-Agents (two real devices → two user_sessions rows + tokens),
 *      and seed a single org with the admin as owner + the member as member
 *      (service-role inserts — the admin must have exactly one membership).
 *   4. As the admin: GET /v1/organization/members/:memberId/sessions →
 *      both rows with team + isNewDevice; DELETE
 *      /v1/organization/members/:memberId/sessions/:deviceB → ledger drops
 *      to one; device B's token 401s on /auth/me while device A's still
 *      200s.
 *   5. Cleanup: the member user and the seeded org are always deleted
 *      (best-effort); the admin account is left in place.
 *
 * Usage:  node scripts/validate-org-session-revoke.mjs
 * Requires: backend/.env.local with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *           migrations 0005 + 0010 applied to that project, and the backend
 *           running (PORT override supported; default .env.local PORT / 4000).
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const ENV = loadEnv(resolve(here, '../.env.local'));

const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE = ENV.SUPABASE_SERVICE_ROLE_KEY;
// validate-session-lifecycle uses ENV.PORT (no process.env.PORT) — the dev
// shell injects a foreign PORT that points at a non-Provance server, so the
// shell override is accepted only when it actually answers /v1/health as the
// Provance backend (resolveBase below).
let BASE = null;
const PORT_CANDIDATES = [...new Set([process.env.PORT, ENV.PORT, 4000].filter(Boolean))];

const ADMIN_EMAIL = process.env.ADMIN_WALK_EMAIL ?? 'founder.admin@provance.local';
const ADMIN_PASSWORD =
  process.env.ADMIN_WALK_PASSWORD ?? 'provance-seed-pass-123';

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
  return { status: res.status, body: parsedBody };
}

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

/** Migration probes for the two gates this walk needs (0005 + 0010). */
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
  const orgs = await probe(`${SUPABASE_URL}/rest/v1/organizations?select=id&limit=1`);
  if (orgs !== 200) missing.push('0005');
  const sessions = await probe(`${SUPABASE_URL}/rest/v1/user_sessions?select=id&limit=1`);
  if (sessions !== 200) missing.push('0010');
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

  // ── 0. Migration pre-flight (0005 + 0010) ────────────────────────────────
  const missing = await probeMissingMigrations();
  if (missing.length > 0) {
    console.error(
      `\nBLOCKED: migrations ${missing.join(' + ')} not applied to ${new URL(SUPABASE_URL).hostname}.`,
    );
    console.error(
      'This walk needs the organizations table (0005) and user_sessions (0010).',
    );
    console.error(
      'Paste .freebuff/combined-0005-0010.sql into the SQL Editor of this project, wait a few seconds, then re-run.',
    );
    process.exit(2);
  }
  check('migrations 0005 + 0010 applied (organizations + user_sessions)', true);

  const stamp = Date.now();
  const memberEmail = `orgrevoke.e2e.${stamp}@provance.local`;
  const memberPassword = 'Provance-E2E-Revoke-2026!';

  let adminUserId = null;
  let memberUserId = null;
  let orgId = null;

  try {
    // ── 1. Admin sign-in (allowlisted) ──────────────────────────────────────
    let signIn = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (signIn.status === 401) {
      const createRes = await adminFetch('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          email_confirm: true,
        }),
      });
      if (createRes.status === 200 || createRes.status === 201) {
        note(`admin account ${ADMIN_EMAIL} did not exist — created it via the GoTrue admin API.`);
        signIn = await apiFetch('/v1/auth/sign-in', {
          method: 'POST',
          body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
        });
      } else if (createRes.status === 422) {
        throw new Error(
          `admin account ${ADMIN_EMAIL} already exists with a different password — set ADMIN_WALK_PASSWORD or reset it in the dashboard`,
        );
      } else {
        throw new Error(`admin create failed: ${createRes.status}`);
      }
    }
    check('org admin sign-in succeeds', signIn.status === 200 && signIn.body?.status === 'authenticated', `HTTP ${signIn.status}`);
    const adminToken = signIn.body?.session?.accessToken;
    adminUserId = adminToken ? jwtSub(adminToken) : null;
    check('admin user id decoded', Boolean(adminUserId), adminUserId ?? 'n/a');

    // Idempotent cleanup of prior runs — a stale walk org would give the
    // admin two memberships and break getMembershipOrThrow (.maybeSingle),
    // and leftover member users would pile up in GoTrue.
    const supabaseEarly = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: staleOrgs } = await supabaseEarly
      .from('organizations')
      .select('id')
      .ilike('name', 'Org Revoke E2E %');
    for (const stale of staleOrgs ?? []) {
      await supabaseEarly.from('organizations').delete().eq('id', stale.id);
      console.log(`cleaned stale walk org ${stale.id}`);
    }
    const { body: allUsers } = await adminFetch('/auth/v1/admin/users?page=1&perPage=1000');
    const leftovers = (allUsers.users || []).filter((u) => u.email.startsWith('orgrevoke.e2e.'));
    for (const leftover of leftovers) {
      await adminFetch(`/auth/v1/admin/users/${leftover.id}`, { method: 'DELETE' });
      console.log(`cleaned leftover member user ${leftover.email}`);
    }

    // ── 2. Throwaway member with two devices ────────────────────────────────
    const createRes = await adminFetch('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: memberEmail,
        password: memberPassword,
        email_confirm: true,
      }),
    });
    if (createRes.status !== 200 && createRes.status !== 201) {
      throw new Error(`member create failed: ${createRes.status} ${JSON.stringify(createRes.body)}`);
    }
    memberUserId = createRes.body.id;
    check('member user created', Boolean(memberUserId), memberEmail);

    const signInA = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      userAgent: UA_DEVICE_A,
      body: { email: memberEmail, password: memberPassword },
    });
    const signInB = await apiFetch('/v1/auth/sign-in', {
      method: 'POST',
      userAgent: UA_DEVICE_B,
      body: { email: memberEmail, password: memberPassword },
    });
    const okSignIn = (r) => r.status === 200 && r.body?.status === 'authenticated';
    check('member sign-in device A (Chrome/macOS)', okSignIn(signInA), `HTTP ${signInA.status}`);
    check('member sign-in device B (Safari/iPhone)', okSignIn(signInB), `HTTP ${signInB.status}`);
    const tokenA = signInA.body?.session?.accessToken;
    const tokenB = signInB.body?.session?.accessToken;
    check('access tokens issued for both devices', Boolean(tokenA && tokenB));

    // ── 3. Seed one org: admin = owner, member = member ─────────────────────
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: `Org Revoke E2E ${stamp}`, plan: 'pro', seats: 10 })
      .select('id')
      .single();
    if (orgError || !org) throw new Error(`seed org failed: ${orgError?.message}`);
    orgId = org.id;

    const adminMember = await supabase
      .from('organization_members')
      .insert({ organization_id: orgId, user_id: adminUserId, role: 'owner', status: 'active' })
      .select()
      .maybeSingle();
    const memberRow = await supabase
      .from('organization_members')
      .insert({ organization_id: orgId, user_id: memberUserId, role: 'member', status: 'active' })
      .select()
      .maybeSingle();
    check(
      'seeded org with admin (owner) + member rows',
      !orgError && !adminMember.error && !memberRow.error && Boolean(org),
      orgId,
    );

    // ── 4. Org-admin view of the member's sessions ──────────────────────────
    const list1 = await apiFetch(`/v1/organization/members/${memberUserId}/sessions`, {
      token: adminToken,
    });
    const rows1 = Array.isArray(list1.body?.sessions) ? list1.body.sessions : [];
    const rowA = rows1.find((r) => (r.device || '').includes('Chrome'));
    const rowB = rows1.find((r) => (r.device || '').includes('Safari'));
    check(
      'GET /organization/members/:id/sessions lists both devices as admin',
      list1.status === 200 && Boolean(rowA && rowB),
      `HTTP ${list1.status}, ${rows1.length} row(s): "${rowA?.device}" / "${rowB?.device}"`,
    );
    check(
      'member sessions carry the team + new-device trust flags',
      Boolean(rowA?.teamId === null && rowA?.isNewDevice === true && rowB?.isNewDevice === true),
      `teamId ${rowA?.teamId}, isNewDevice ${rowA?.isNewDevice}/${rowB?.isNewDevice}`,
    );

    // ── 5. Revoke device B through the org surface ──────────────────────────
    const revoke = rowB
      ? await apiFetch(`/v1/organization/members/${memberUserId}/sessions/${rowB.id}`, {
          method: 'DELETE',
          token: adminToken,
        })
      : null;
    check(
      'DELETE /organization/members/:id/sessions/:sid revokes device B',
      revoke?.status === 200 && revoke?.body?.ok === true,
      revoke ? `HTTP ${revoke.status}` : 'skipped — no device-B row',
    );

    const list2 = await apiFetch(`/v1/organization/members/${memberUserId}/sessions`, {
      token: adminToken,
    });
    const rows2 = Array.isArray(list2.body?.sessions) ? list2.body.sessions : [];
    check(
      'ledger drops to 1 row after the org-admin revocation',
      rows2.length === 1 && rows2[0]?.id === rowA?.id,
      `${rows2.length} row(s)`,
    );

    // ── 6. Two-device proof: revoked token dies, survivor lives ─────────────
    const meB = await apiFetch('/v1/auth/me', { token: tokenB });
    check(
      'revoked device B token rejected (401)',
      meB.status === 401,
      `HTTP ${meB.status}`,
    );
    const meA = await apiFetch('/v1/auth/me', { token: tokenA });
    check('surviving device A token still valid (200)', meA.status === 200, `HTTP ${meA.status}`);

    if (revoke?.status === 200 && meB.status === 200) {
      note('CONTRACT MISMATCH: revoked session’s access token still validates via /auth/me');
    }
  } finally {
    // ── 7. Cleanup: member user + org (cascades members); admin stays ───────
    if (memberUserId) {
      const del = await adminFetch(`/auth/v1/admin/users/${memberUserId}`, { method: 'DELETE' });
      console.log(`\ncleanup: member user ${del.status === 200 ? 'deleted' : `delete failed (${del.status})`}`);
    }
    if (orgId) {
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: removeError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', orgId);
        console.log(`cleanup: seeded org ${removeError ? `remove failed (${removeError.message})` : 'removed'}`);
      } catch (cleanupError) {
        console.log(`cleanup: seeded org remove skipped (${cleanupError.message})`);
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
