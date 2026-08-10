import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '../queue/queue.service';
import { SupabaseService } from '../supabase/supabase.service';
import { HealthController } from './health.controller';
import { MigrationHealthService } from './migration-health.service';

// A healthy migration diff — every manifest probe applied, nothing missing.
const HEALTHY_MIGRATION_DIFF = {
  unavailable: false,
  checked: 19,
  applied: ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012', '0013', '0014', '0015', '0016', '0018', '0019', '0020'],
  missing: [],
  errored: [],
  skipped: [],
};

// ---------------------------------------------------------------------------
// Minimal mocks — the readiness probe only touches isConfigured(), the admin
// client's select() chain, and QueueService.isConfigured().
// ---------------------------------------------------------------------------

function createSelectBuilder(
  selectError: { code?: string; message?: string } | null,
  sessionsError: { code?: string; message?: string } | null,
  throwOnProbe = false,
) {
  // The readiness probe runs two select probes (scans + user_sessions); the
  // builder returns the error for whichever table the chain targeted.
  let table = '';
  const builder = {
    from: jest.fn((target: string) => {
      table = target;
      return builder;
    }),
    select: jest.fn(() => builder),
    limit: jest.fn(async () => {
      if (throwOnProbe) {
        throw new Error('connection reset');
      }
      return {
        data: null,
        error: table === 'user_sessions' ? sessionsError : selectError,
      };
    }),
  };
  return builder as unknown as ReturnType<SupabaseService['getAdminClient']>;
}

async function createController(options: {
  supabaseConfigured: boolean;
  selectError: { code?: string; message?: string } | null;
  sessionsError?: { code?: string; message?: string } | null;
  queueConfigured: boolean;
  throwOnProbe?: boolean;
  migrationDiff?: unknown;
}) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      {
        provide: SupabaseService,
        useValue: {
          isConfigured: jest.fn(() => options.supabaseConfigured),
          getAdminClient: jest.fn(() =>
            options.supabaseConfigured
              ? createSelectBuilder(
                  options.selectError,
                  options.sessionsError ?? null,
                  options.throwOnProbe,
                )
              : null,
          ),
        },
      },
      {
        provide: QueueService,
        useValue: {
          isConfigured: jest.fn(() => options.queueConfigured),
        },
      },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((_key: string, fallback?: unknown) => fallback),
        },
      },
      {
        provide: MigrationHealthService,
        useValue: {
          check: jest.fn(async () =>
            options.migrationDiff ?? HEALTHY_MIGRATION_DIFF,
          ),
        },
      },
    ],
  }).compile();

  return moduleFixture.get<HealthController>(HealthController);
}

describe('HealthController (readiness probe)', () => {
  it('reports ready when supabase + scans schema + sessions ledger are present', async () => {
    const controller = await createController({
      supabaseConfigured: true,
      selectError: null,
      sessionsError: null,
      queueConfigured: true,
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('ready');
    expect(result.checks.supabase.ready).toBe(true);
    expect(result.checks.scansSchema.ready).toBe(true);
    expect(result.checks.userSessions.ready).toBe(true);
    expect(result.checks.queue.ready).toBe(true);
    expect(result.checks.migrations.ready).toBe(true);
    expect(result.checks.migrations.detail).toContain('all 19 migrations applied');
  });

  it('flags missing migrations with the exact files to apply', async () => {
    const controller = await createController({
      supabaseConfigured: true,
      selectError: null,
      sessionsError: null,
      queueConfigured: true,
      migrationDiff: {
        unavailable: false,
        checked: 2,
        applied: [],
        missing: [
          {
            migration: '0005',
            file: '0005_organization.sql',
            reason: 'PGRST205: Could not find the table public.organizations',
          },
          {
            migration: '0009',
            file: '0009_scan_processing.sql',
            reason: '42703: column scans.processing_mode does not exist',
          },
        ],
        errored: [],
        skipped: [],
      },
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks.migrations.ready).toBe(false);
    expect(result.checks.migrations.detail).toContain('0005 (0005_organization.sql)');
    expect(result.checks.migrations.detail).toContain('0009 (0009_scan_processing.sql)');
    expect(result.checks.migrations.detail).toContain(
      'supabase/migrations/0005_organization.sql',
    );
  });

  it('reports degraded when the migration diff cannot run', async () => {
    const controller = await createController({
      supabaseConfigured: true,
      selectError: null,
      sessionsError: null,
      queueConfigured: true,
      migrationDiff: {
        unavailable: true,
        unavailableReason: 'migrations dir not found (/nonexistent)',
        checked: 0,
        applied: [],
        missing: [],
        errored: [],
        skipped: [],
      },
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks.migrations.ready).toBe(false);
    expect(result.checks.migrations.detail).toContain('unavailable');
  });

  it('flags the missing 0009 columns with an actionable message', async () => {
    const controller = await createController({
      supabaseConfigured: true,
      selectError: {
        code: '42703',
        message: 'column scans.processing_mode does not exist',
      },
      sessionsError: null,
      queueConfigured: false,
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks.scansSchema.ready).toBe(false);
    expect(result.checks.scansSchema.detail).toContain(
      'missing 0009 columns',
    );
    expect(result.checks.scansSchema.detail).toContain(
      '0009_scan_processing.sql',
    );
    // The sessions ledger is fine — the degraded status comes from scans.
    expect(result.checks.userSessions.ready).toBe(true);
    // Queue without Redis is still "ready" (inline fallback) — just noted.
    expect(result.checks.queue.ready).toBe(true);
    expect(result.checks.queue.detail).toContain('inline');
  });

  it('flags the missing 0010 user_sessions table with an actionable message', async () => {
    const controller = await createController({
      supabaseConfigured: true,
      selectError: null,
      sessionsError: {
        code: 'PGRST205',
        message: 'Could not find the table public.user_sessions in the schema cache',
      },
      queueConfigured: true,
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks.scansSchema.ready).toBe(true);
    expect(result.checks.userSessions.ready).toBe(false);
    expect(result.checks.userSessions.detail).toContain('missing');
    expect(result.checks.userSessions.detail).toContain(
      '0010_user_sessions.sql',
    );
  });

  it('reports degraded when supabase is not configured', async () => {
    const controller = await createController({
      supabaseConfigured: false,
      selectError: null,
      queueConfigured: false,
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks.supabase.ready).toBe(false);
    expect(result.checks.scansSchema.detail).toBe('Supabase not configured');
    expect(result.checks.userSessions.detail).toBe('Supabase not configured');
  });

  it('never throws — a thrown probe records a degraded check entry', async () => {
    const controller = await createController({
      supabaseConfigured: true,
      selectError: null,
      queueConfigured: false,
      throwOnProbe: true,
    });

    const result = await controller.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks.scansSchema.ready).toBe(false);
    expect(result.checks.scansSchema.detail).toContain('probe threw');
    expect(result.checks.userSessions.ready).toBe(false);
    expect(result.checks.userSessions.detail).toContain('probe threw');
  });
});
