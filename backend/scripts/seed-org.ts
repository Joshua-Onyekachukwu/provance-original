/**
 * seed-org.ts — seeds a real Supabase org fixture so the live backend paths
 * are testable end-to-end without hand-inserting rows:
 *
 *   - an owner auth user (signs in with the printed password)
 *   - their profile (admin, team access)
 *   - an organization with three teams
 *   - the owner's membership row  → makes GET /v1/organization resolve
 *   - a spread of sample scans    → feeds the queue / analytics / reports
 *     surfaces (queued, processing, complete with verdict payloads, failed)
 *
 * Idempotent: every write is a deterministic-id upsert, so re-running just
 * tops up whatever is missing. Run from the backend directory:
 *
 *   npm run seed:org
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env (the
 * service role bypasses RLS, matching how the backend writes).
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Env loading (no dotenv dependency — @nestjs/config does this at runtime,
// so the script mirrors it: backend/.env, KEY=VALUE lines, # comments).
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string | undefined> {
  const envPath = path.resolve(process.cwd(), '.env');
  const env: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
  }

  return { ...process.env, ...env };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const OWNER_EMAIL = 'founder.admin@provance.local';
// Overridable so a shared checkout never commits to a hardcoded secret path;
// the fallback is a dev-only fixture password. This account maps to the
// admin email list (ADMIN_EMAILS), so keep the printed credentials out of
// any shared environment.
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'provance-seed-pass-123';
const OWNER_DISPLAY_NAME = 'Founder Admin';

const ORG_ID = '00000000-0000-4000-8000-000000000001';
const ORG = {
  id: ORG_ID,
  name: 'Provance HQ',
  slug: 'provance-hq',
  plan: 'pro',
  seats: 25,
  storage_limit_gb: 100,
  // Filled from the scan fixture below so the org row and the monitoring
  // storage probe agree (~141 MB across the seeded files).
  storage_used_gb: 0,
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const TEAMS = [
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Product & Engineering',
    description: 'Builds and ships the verification platform',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Legal & Compliance',
    description: 'Evidence review, policy, and disclosure',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Trust & Safety',
    description: 'Investigation and media triage',
  },
];

type ScanSeed = {
  id: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  verdict?: 'likely_authentic' | 'suspicious' | 'inconclusive';
  failure_reason?: string;
};

const SCANS: ScanSeed[] = [
  { id: '10000000-0000-4000-8000-000000000001', status: 'queued', original_filename: 'town-hall-recording.mp4', mime_type: 'video/mp4', file_size_bytes: 48_200_000 },
  { id: '10000000-0000-4000-8000-000000000002', status: 'queued', original_filename: 'press-release-audio.wav', mime_type: 'audio/wav', file_size_bytes: 12_800_000 },
  { id: '10000000-0000-4000-8000-000000000003', status: 'processing', original_filename: 'product-screenshot.png', mime_type: 'image/png', file_size_bytes: 3_400_000 },
  { id: '10000000-0000-4000-8000-000000000004', status: 'complete', original_filename: 'contract-signing.jpeg', mime_type: 'image/jpeg', file_size_bytes: 2_100_000, verdict: 'likely_authentic' },
  { id: '10000000-0000-4000-8000-000000000005', status: 'complete', original_filename: 'ceo-statement.mp4', mime_type: 'video/mp4', file_size_bytes: 64_000_000, verdict: 'suspicious' },
  { id: '10000000-0000-4000-8000-000000000006', status: 'complete', original_filename: 'interview-clip.wav', mime_type: 'audio/wav', file_size_bytes: 8_900_000, verdict: 'inconclusive' },
  { id: '10000000-0000-4000-8000-000000000007', status: 'complete', original_filename: 'id-document.png', mime_type: 'image/png', file_size_bytes: 1_700_000, verdict: 'likely_authentic' },
  { id: '10000000-0000-4000-8000-000000000008', status: 'failed', original_filename: 'corrupted-upload.mp4', mime_type: 'video/mp4', file_size_bytes: 0, failure_reason: 'File could not be read after upload' },
];

function buildResultPayload(verdict?: ScanSeed['verdict']) {
  if (!verdict) return null;
  const confidence =
    verdict === 'likely_authentic' ? 0.93 : verdict === 'suspicious' ? 0.88 : 0.61;
  return {
    verdict: {
      class: verdict,
      confidence,
      summary:
        verdict === 'likely_authentic'
          ? 'No model signature or metadata anomaly detected; continuity intact.'
          : verdict === 'suspicious'
            ? 'Model signature detected with anomalous spectral energy in two regions.'
            : 'Confidence too low for a definitive call; metadata chain incomplete.',
    },
    signals: [
      { label: 'Model signature scan', confidence: Math.round(confidence * 100), finding: verdict === 'likely_authentic' ? 'None detected' : 'Model signature detected' },
      { label: 'Metadata chain', confidence: Math.round(confidence * 100), finding: verdict === 'suspicious' ? 'Metadata chain incomplete' : 'Intact' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in backend/.env — ' +
        'copy backend/.env.example and fill in real credentials first.',
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. Owner auth user (reuse if the email already exists) ───────────────
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const owner = existing?.users?.find((user) => user.email === OWNER_EMAIL);

  let ownerId: string;
  if (owner) {
    ownerId = owner.id;
    console.log(`Owner auth user exists: ${OWNER_EMAIL} (${ownerId})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: OWNER_DISPLAY_NAME },
    });
    if (error || !data?.user) {
      console.error('Failed to create owner auth user:', error?.message ?? 'no user returned');
      process.exit(1);
    }
    ownerId = data.user.id;
    console.log(`Owner auth user created: ${OWNER_EMAIL}`);
  }

  // ── 2. Profile ───────────────────────────────────────────────────────────
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        user_id: ownerId,
        email: OWNER_EMAIL,
        display_name: OWNER_DISPLAY_NAME,
        organization: 'Provance HQ',
        role_title: 'Founder',
        default_workspace: 'team',
        email_notifications: true,
        account_role: 'admin',
        team_access: true,
      },
      { onConflict: 'user_id' },
    );
  if (profileError) {
    console.error('Failed to upsert profile:', profileError.message);
    process.exit(1);
  }
  console.log('Profile upserted.');

  // ── 3. Organization ──────────────────────────────────────────────────────
  const seededBytes = SCANS.reduce((sum, scan) => sum + scan.file_size_bytes, 0);
  const { error: orgError } = await admin
    .from('organizations')
    .upsert(
      {
        ...ORG,
        storage_used_gb: round2(seededBytes / 1_000_000_000),
        scan_count: SCANS.filter((scan) => scan.status === 'complete').length,
      },
      { onConflict: 'id' },
    );
  if (orgError) {
    console.error('Failed to upsert organization:', orgError.message);
    process.exit(1);
  }
  console.log(`Organization upserted: ${ORG.name}`);

  // ── 4. Teams ─────────────────────────────────────────────────────────────
  for (const team of TEAMS) {
    const { error } = await admin
      .from('teams')
      .upsert(
        { id: team.id, organization_id: ORG_ID, name: team.name, description: team.description },
        { onConflict: 'id' },
      );
    if (error) {
      console.error(`Failed to upsert team ${team.name}:`, error.message);
      process.exit(1);
    }
  }
  console.log(`Teams upserted: ${TEAMS.map((team) => team.name).join(', ')}`);

  // ── 5. Membership (owner, active, first team) ────────────────────────────
  const { error: memberError } = await admin
    .from('organization_members')
    .upsert(
      {
        organization_id: ORG_ID,
        user_id: ownerId,
        role: 'owner',
        team_id: TEAMS[0].id,
        status: 'active',
      },
      { onConflict: 'organization_id,user_id' },
    );
  if (memberError) {
    console.error('Failed to upsert membership:', memberError.message);
    process.exit(1);
  }
  console.log('Owner membership upserted.');

  // ── 6. Sample scans ──────────────────────────────────────────────────────
  for (const scan of SCANS) {
    const { error } = await admin
      .from('scans')
      .upsert(
        {
          id: scan.id,
          user_id: ownerId,
          status: scan.status,
          original_filename: scan.original_filename,
          mime_type: scan.mime_type,
          file_size_bytes: scan.file_size_bytes,
          storage_bucket: 'provance-uploads',
          storage_path: `seeds/${scan.id}/${scan.original_filename}`,
          result_payload: buildResultPayload(scan.verdict),
          failure_reason: scan.failure_reason ?? null,
        },
        { onConflict: 'id' },
      );
    if (error) {
      console.error(`Failed to upsert scan ${scan.original_filename}:`, error.message);
      process.exit(1);
    }
  }
  console.log(`Scans upserted: ${SCANS.length} (${SCANS.map((s) => s.status).join(', ')})`);

  console.log('\nSeed complete. Sign in with:');
  console.log(`  email:    ${OWNER_EMAIL}`);
  console.log(`  password: ${OWNER_PASSWORD}`);
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
