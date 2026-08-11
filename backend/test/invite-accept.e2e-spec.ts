import { createHash, randomBytes } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { QueueService } from '../src/queue/queue.service';
import { SupabaseService } from '../src/supabase/supabase.service';

// ---------------------------------------------------------------------------
// Live-integration gate (opt-in)
//
// The invite-accept path calls `auth.admin.createUser` (the real Supabase
// GoTrue admin API), which the table-level mocks cannot fake — so this suite
// only ever runs against a live Supabase project. It is **opt-in via
// PROVANCE_LIVE_E2E=1** and otherwise always skipped, even when real
// credentials are present in the process env.
//
// Why the flag: the AppModule's ConfigModule.forRoot({ envFilePath:
// ['.env.local', ...] }) loads this checkout's real project credentials into
// process.env the moment the spec imports AppModule. A mere presence check
// would therefore run the live suite on every local `npm run test:e2e`
// (writing org/invite/user rows to the real project) — the env leak this
// gate removes. Requiring an explicit flag keeps the full suite green by
// default and confines live runs to operators who opt in. When the flag is
// set but credentials are missing, the suite fails loudly instead of
// silently skipping.
// ---------------------------------------------------------------------------

const LIVE_E2E_FLAG = 'PROVANCE_LIVE_E2E';

const hasSupabaseCredentials = Boolean(
  process.env.SUPABASE_URL?.trim() &&
    process.env.SUPABASE_ANON_KEY?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
);

const liveRequested = process.env[LIVE_E2E_FLAG] === '1';

if (liveRequested && !hasSupabaseCredentials) {
  throw new Error(
    `${LIVE_E2E_FLAG}=1 requires SUPABASE_URL, SUPABASE_ANON_KEY, and ` +
      'SUPABASE_SERVICE_ROLE_KEY (the AppModule loads them from .env.local).',
  );
}

const suite = liveRequested ? describe : describe.skip;

type AdminClient = NonNullable<ReturnType<SupabaseService['getAdminClient']>>;

suite('Organization invite accept (live e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let admin: AdminClient;

  // Throwaway identity + org per run; cleaned up in afterAll so repeated runs
  // never collide.
  const email = `e2e-accept-${Date.now()}@provance.test`;
  const rawToken = randomBytes(24).toString('hex');
  let orgId = '';
  let inviteId = '';
  let createdUserId = '';

  // Live boot + seed needs more than jest's 5s default hook timeout.
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(QueueService)
      .useValue({
        // No Redis in tests — the scans module must not attempt a real queue.
        isConfigured: jest.fn(() => false),
        enqueueScanProcessing: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    http = request(app.getHttpServer());
    admin = app.get(SupabaseService).getAdminClient() as AdminClient;

    // ── Seed: org with free seats + pending invite (token_hash only) ───────
    // seats: 10 with zero active members, so the accept seat guard passes.
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: `E2E Accept ${Date.now()}`, plan: 'pro', seats: 10 })
      .select('id')
      .single();
    if (orgError || !org) {
      // A schema-cache miss means the 0005 org migrations aren't applied to
      // this Supabase project yet — name the fix rather than a bare failure.
      const hint = orgError?.message?.includes('schema cache')
        ? ' The org tables are missing — apply supabase/migrations/0005_organization.sql to this project.'
        : '';
      throw new Error(
        `seed org failed: ${orgError?.message ?? 'no row returned'}${hint}`,
      );
    }
    orgId = org.id as string;

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const { data: invite, error: inviteError } = await admin
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        email,
        role: 'member',
        status: 'pending',
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      })
      .select('id')
      .single();
    if (inviteError || !invite) {
      throw new Error(
        `seed invite failed: ${inviteError?.message ?? 'no row returned'}`,
      );
    }
    inviteId = invite.id as string;
  }, 60_000);

  afterAll(async () => {
    // Roll back everything this run created: the auth user first (its FK rows
    // cascade from the org), then the org (members + invites cascade).
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }
    if (orgId) {
      await admin.from('organizations').delete().eq('id', orgId).catch(() => undefined);
    }
    await app?.close();
  }, 60_000);

  it('accepts the invite: creates the user, joins the roster, marks it accepted', async () => {
    const response = await http
      .post('/v1/auth/invites/accept')
      .send({
        token: rawToken,
        fullName: 'E2E Accept User',
        password: 'AcceptPass123!',
      })
      .expect(200);

    expect(response.body.status).toBe('active');
    expect(response.body.user.email).toBe(email);
    createdUserId = response.body.user.id as string;
    expect(createdUserId).toMatch(/^[0-9a-f-]{36}$/);

    // The membership row exists with the invited role, active status, and the
    // org the invite belonged to.
    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id, user_id, role, status')
      .eq('organization_id', orgId)
      .eq('user_id', createdUserId)
      .maybeSingle();
    expect(membership).toMatchObject({
      organization_id: orgId,
      user_id: createdUserId,
      role: 'member',
      status: 'active',
    });

    // The pending invite is flipped to accepted.
    const { data: invite } = await admin
      .from('organization_invites')
      .select('status')
      .eq('id', inviteId)
      .maybeSingle();
    expect(invite?.status).toBe('accepted');
  });

  it('rejects a token that was never issued', async () => {
    const forged = randomBytes(24).toString('hex');
    const response = await http
      .post('/v1/auth/invites/accept')
      .send({
        token: forged,
        fullName: 'Impostor',
        password: 'AcceptPass123!',
      })
      .expect(401);

    expect(response.body.message).toContain('Invalid or expired invite.');
  });
});
