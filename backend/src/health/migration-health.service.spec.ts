import { Logger } from '@nestjs/common';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { MigrationHealthService } from './migration-health.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeFixtureDir(files: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'provance-migration-probe-'));
  for (const file of files) {
    writeFileSync(join(dir, file), '-- fixture migration');
  }
  return dir;
}

function cleanupFixtureDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Table+column aware admin client: probeResults maps `${table}.${column}` to
 * the error to return (null → applied). Non-head select so error bodies parse.
 */
function createAdminClient(
  probeResults: Record<string, { code?: string; message?: string } | null>,
) {
  let table = '';
  let column = '';
  const builder = {
    from: jest.fn((target: string) => {
      table = target;
      return builder;
    }),
    select: jest.fn((columns: string) => {
      column = columns;
      return builder;
    }),
    limit: jest.fn(async () => {
      const error = probeResults[`${table}.${column}`] ?? null;
      return { data: null, error };
    }),
  };
  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createService(options: {
  migrationsDir: string | undefined;
  adminClient: ReturnType<typeof createAdminClient> | null;
}) {
  const supabaseService = {
    getAdminClient: jest.fn(() => options.adminClient),
  } as unknown as SupabaseService;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'MIGRATIONS_DIR') return options.migrationsDir;
      return undefined;
    }),
  } as unknown as ConfigService;

  return new MigrationHealthService(supabaseService, configService);
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

describe('MigrationHealthService', () => {
  describe('check()', () => {
    it('classifies applied vs missing vs skipped from live probes', async () => {
      const dir = makeFixtureDir([
        '0001_waitlist_auth.sql',
        '0005_organization.sql',
        '0009_scan_processing.sql',
        '0099_future.sql', // manifest-less → self-enforcement skip
      ]);

      try {
        const service = createService({
          migrationsDir: dir,
          adminClient: createAdminClient({
            'waitlist_applications.id': null, // 0001 → applied
            'organizations.id': {
              code: 'PGRST205',
              message: "Could not find the table 'public.organizations' in the schema cache",
            }, // 0005 → missing
            'scans.processing_mode': {
              code: '42703',
              message: 'column scans.processing_mode does not exist',
            }, // 0009 → missing
          }),
        });

        const diff = await service.check();

        expect(diff.unavailable).toBe(false);
        expect(diff.checked).toBe(3);
        expect(diff.applied).toEqual(['0001']);
        expect(diff.missing).toHaveLength(2);
        expect(diff.missing.map((m) => m.migration)).toEqual(['0005', '0009']);
        expect(diff.missing[0].reason).toContain('PGRST205');
        expect(diff.missing[1].reason).toContain('42703');

        // Manifest files absent from the dir + the seed-only 0017 + the
        // manifest-less 0099 all land in skipped with the right note.
        expect(diff.skipped.some((s) => s.file === '0099_future.sql')).toBe(true);
        expect(
          diff.skipped.find((s) => s.file === '0099_future.sql')?.note,
        ).toContain('no schema probe defined');
        expect(
          diff.skipped.some((s) => s.file === '0017_user_sessions_seed.sql'),
        ).toBe(true);
        expect(
          diff.skipped.some((s) => s.file === '0002_scans.sql'),
        ).toBe(true);
      } finally {
        cleanupFixtureDir(dir);
      }
    });

    it('reports unavailable when the migrations dir is missing', async () => {
      const service = createService({
        migrationsDir: join(tmpdir(), 'provance-does-not-exist'),
        adminClient: createAdminClient({}),
      });

      const diff = await service.check();

      expect(diff.unavailable).toBe(true);
      expect(diff.unavailableReason).toContain('migrations dir not found');
    });

    it('reports unavailable when the supabase admin client is unavailable', async () => {
      const dir = makeFixtureDir(['0001_waitlist_auth.sql']);
      try {
        const service = createService({ migrationsDir: dir, adminClient: null });

        const diff = await service.check();

        expect(diff.unavailable).toBe(true);
        expect(diff.unavailableReason).toContain('Supabase admin client');
      } finally {
        cleanupFixtureDir(dir);
      }
    });

    it('treats non-schema probe failures as errored (unverifiable)', async () => {
      const dir = makeFixtureDir(['0001_waitlist_auth.sql']);
      try {
        const service = createService({
          migrationsDir: dir,
          adminClient: createAdminClient({
            'waitlist_applications.id': {
              code: 'PGRST116',
              message: 'something unexpected',
            },
          }),
        });

        const diff = await service.check();

        expect(diff.missing).toHaveLength(0);
        expect(diff.errored).toHaveLength(1);
        expect(diff.errored[0].migration).toBe('0001');
      } finally {
        cleanupFixtureDir(dir);
      }
    });
  });

  describe('onModuleInit() startup warning', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('logs one warning per missing migration with the file to apply', async () => {
      const dir = makeFixtureDir([
        '0005_organization.sql',
        '0009_scan_processing.sql',
      ]);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      try {
        const service = createService({
          migrationsDir: dir,
          adminClient: createAdminClient({
            'organizations.id': {
              code: 'PGRST205',
              message: "Could not find the table 'public.organizations'",
            },
            'scans.processing_mode': {
              code: '42703',
              message: 'column scans.processing_mode does not exist',
            },
          }),
        });

        await service.onModuleInit();

        const warnings = warnSpy.mock.calls.map((call) => String(call[0])).join('\n');
        expect(warnings).toContain('Migration 0005 NOT applied');
        expect(warnings).toContain('0005_organization.sql');
        expect(warnings).toContain('Migration 0009 NOT applied');
        expect(warnings).toContain('0009_scan_processing.sql');
      } finally {
        cleanupFixtureDir(dir);
      }
    });

    it('logs a clean bill when every migration probe succeeds', async () => {
      // Default migrations dir resolution — the real repo dir (backend runs
      // from backend/, so __dirname → ../../../supabase/migrations = repo).
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const service = createService({
        migrationsDir: undefined, // fall back to the default repo dir
        adminClient: createAdminClient({}), // every probe returns no error
      });

      await service.onModuleInit();

      const logs = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
      // 0001–0024 (0017 seed-only skip) → 23 checked.
      expect(logs).toContain('Schema check: all 23 supabase migrations appear applied');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('never throws when the dir or admin client is unavailable', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const service = createService({
        migrationsDir: join(tmpdir(), 'provance-does-not-exist'),
        adminClient: null,
      });

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
