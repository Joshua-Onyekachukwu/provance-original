import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Migration health — compares the supabase/migrations/ files against the live
 * Supabase schema so a half-migrated deployment can never happen silently
 * again (the exact gap that 503'd POST /v1/scans and degraded readiness for
 * weeks while the 0005+ set was missing).
 *
 * There is no migration-tracking table (migrations are applied manually via
 * the dashboard SQL editor), so "applied" is inferred by probing one schema
 * object per migration — a non-head `select(column).limit(1)` so PostgREST
 * error bodies parse (PGRST205/42703). The probe pattern matters: HEAD /
 * `head: true` requests mask error bodies and can falsely report a table as
 * present (see docs/engineering/MIGRATION_RUNBOOK.md probe caveat).
 *
 * The startup warning (onModuleInit) logs every missing migration at boot,
 * and the readiness endpoint surfaces the same diff so one request diagnoses
 * the deployment gap. Both degrade gracefully — a missing migrations dir or
 * an unconfigured Supabase client is reported, never thrown.
 */

export interface MigrationProbe {
  migration: string;
  file: string;
  /** Seed-only migrations (no schema objects) cannot be probed. */
  probeable: boolean;
  table?: string;
  column?: string;
  note?: string;
}

export interface MissingMigration {
  migration: string;
  file: string;
  reason: string;
}

export interface MigrationDiff {
  /** True when the diff could not run (migrations dir or Supabase absent). */
  unavailable: boolean;
  unavailableReason?: string;
  /** Number of probes actually run against the live schema. */
  checked: number;
  /** Migration numbers whose probed object is present. */
  applied: string[];
  /** Migration numbers whose probed object is confirmed absent. */
  missing: MissingMigration[];
  /** Migrations whose probe failed for a non-schema reason (unverifiable). */
  errored: MissingMigration[];
  /**
   * Files that could not be probed (seed-only, missing from dir, no probe).
   * `expected` marks by-design skips (e.g. seed-only migrations) that are
   * surfaced in the diff but not warned about at boot.
   */
  skipped: { migration: string; file: string; note: string; expected?: boolean }[];
}

/**
 * One probe per schema migration. Keep this in sync when new migrations land:
 * a migration file with no probe is logged as a warning at boot (the checker
 * is self-enforcing — it refuses to silently skip an unknown file).
 */
// Exported so scripts/validate-migrations.mjs probes the SAME list the
// readiness gate uses — one source of truth, no drift between the health
// check and the one-command pre-walk verification.
export const MIGRATION_PROBES: MigrationProbe[] = [
  { migration: '0001', file: '0001_waitlist_auth.sql', probeable: true, table: 'waitlist_applications', column: 'id', note: 'waitlist + access_invites + auth_audit_events' },
  { migration: '0002', file: '0002_scans.sql', probeable: true, table: 'scans', column: 'id' },
  { migration: '0003', file: '0003_admin_ops.sql', probeable: true, table: 'waitlist_applications', column: 'notes', note: 'adds waitlist_applications.notes + access_invites.invited_by' },
  { migration: '0004', file: '0004_profiles.sql', probeable: true, table: 'profiles', column: 'user_id' },
  { migration: '0005', file: '0005_organization.sql', probeable: true, table: 'organizations', column: 'id', note: 'org + teams + organization_members + organization_invites' },
  { migration: '0006', file: '0006_feature_flags.sql', probeable: true, table: 'feature_flags', column: 'key' },
  { migration: '0007', file: '0007_incidents.sql', probeable: true, table: 'admin_incidents', column: 'id' },
  { migration: '0008', file: '0008_audit_logs.sql', probeable: true, table: 'audit_logs', column: 'id' },
  { migration: '0009', file: '0009_scan_processing.sql', probeable: true, table: 'scans', column: 'processing_mode', note: 'adds scans.processing_mode/team_id/completed_at — hard gate for the scan round-trip' },
  { migration: '0010', file: '0010_user_sessions.sql', probeable: true, table: 'user_sessions', column: 'id', note: '+ user_security_settings' },
  { migration: '0011', file: '0011_notifications.sql', probeable: true, table: 'notifications', column: 'id' },
  { migration: '0012', file: '0012_profiles_team.sql', probeable: true, table: 'profiles', column: 'team_id' },
  { migration: '0013', file: '0013_scan_dedup.sql', probeable: true, table: 'scans', column: 'file_hash_sha256' },
  { migration: '0014', file: '0014_crash_reports.sql', probeable: true, table: 'crash_reports', column: 'client_id' },
  { migration: '0015', file: '0015_invite_token_hash.sql', probeable: true, table: 'organization_invites', column: 'token_hash' },
  { migration: '0016', file: '0016_role_scopes.sql', probeable: true, table: 'role_scopes', column: 'role_id' },
  { migration: '0017', file: '0017_user_sessions_seed.sql', probeable: false, note: 'seed-only migration (no schema objects to probe)' },
  { migration: '0018', file: '0018_better_auth.sql', probeable: true, table: 'verification', column: 'id', note: 'better-auth core + plugin tables (probe: verification)' },
  { migration: '0019', file: '0019_scan_idempotency.sql', probeable: true, table: 'scans', column: 'idempotency_key' },
  { migration: '0020', file: '0020_api_usage.sql', probeable: true, table: 'api_usage', column: 'user_id' },
  { migration: '0021', file: '0021_scan_attempts.sql', probeable: true, table: 'scans', column: 'attempts_made', note: 'adds scans.attempts_made/max_attempts — retry telemetry for the admin Jobs payload' },
];

type AdminClient = NonNullable<ReturnType<SupabaseService['getAdminClient']>>;

@Injectable()
export class MigrationHealthService implements OnModuleInit {
  private readonly logger = new Logger(MigrationHealthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  /** Resolves the repo migrations dir; overridable via MIGRATIONS_DIR. */
  private get migrationsDir(): string {
    return (
      this.configService.get<string>('MIGRATIONS_DIR') ||
      resolve(__dirname, '../../../supabase/migrations')
    );
  }

  private listMigrationFiles(): string[] | null {
    try {
      return readdirSync(this.migrationsDir)
        .filter((name) => /^\d{4}_.*\.sql$/.test(name))
        .sort();
    } catch {
      return null;
    }
  }

  private async probeMigration(
    adminClient: AdminClient,
    probe: MigrationProbe,
  ): Promise<{ applied: boolean; missing: boolean; reason: string }> {
    const { error } = await adminClient
      .from(probe.table as string)
      .select(probe.column as string)
      .limit(1);

    if (!error) {
      return { applied: true, missing: false, reason: '' };
    }

    const code = error.code ?? '';
    const message = error.message ?? '';
    const schemaAbsent =
      code === 'PGRST205' ||
      code === 'PGRST204' ||
      code === '42703' ||
      message.includes('Could not find the table') ||
      message.includes('relation ') ||
      message.includes('does not exist');

    if (schemaAbsent) {
      return { applied: false, missing: true, reason: `${code || 'schema'}: ${message}` };
    }

    return { applied: false, missing: false, reason: `${code || 'unknown'}: ${message}` };
  }

  /**
   * Diff the migration files against the live schema. Never throws: probe and
   * filesystem failures are folded into the diff (unavailable / errored) so a
   * health check can always answer.
   */
  async check(): Promise<MigrationDiff> {
    const diff: MigrationDiff = {
      unavailable: false,
      checked: 0,
      applied: [],
      missing: [],
      errored: [],
      skipped: [],
    };

    const files = this.listMigrationFiles();
    if (files === null) {
      diff.unavailable = true;
      diff.unavailableReason = `migrations dir not found (${this.migrationsDir})`;
      return diff;
    }

    const adminClient = this.supabaseService.getAdminClient();
    if (!adminClient) {
      diff.unavailable = true;
      diff.unavailableReason = 'Supabase admin client unavailable (credentials missing)';
      return diff;
    }

    const probesToRun: MigrationProbe[] = [];

    for (const probe of MIGRATION_PROBES) {
      if (!probe.probeable || !probe.table || !probe.column) {
        // By-design skip (seed-only migrations) — surfaced but not warned.
        diff.skipped.push({
          migration: probe.migration,
          file: probe.file,
          note: probe.note ?? 'not probeable',
          expected: true,
        });
        continue;
      }

      if (!files.includes(probe.file)) {
        diff.skipped.push({
          migration: probe.migration,
          file: probe.file,
          note: 'migration file not present in migrations dir',
        });
        continue;
      }

      probesToRun.push(probe);
    }

    // Probes run in parallel — the readiness endpoint should answer in a
    // couple of seconds, not ~20 (one Supabase round-trip per probe).
    diff.checked = probesToRun.length;
    const results = await Promise.all(
      probesToRun.map(async (probe) => ({
        probe,
        verdict: await this.probeMigration(adminClient, probe),
      })),
    );

    for (const { probe, verdict } of results) {
      if (verdict.applied) {
        diff.applied.push(probe.migration);
      } else if (verdict.missing) {
        diff.missing.push({
          migration: probe.migration,
          file: probe.file,
          reason: verdict.reason,
        });
      } else {
        diff.errored.push({
          migration: probe.migration,
          file: probe.file,
          reason: verdict.reason,
        });
      }
    }

    // Stable ordering (parallel completion order is arbitrary).
    diff.applied.sort();
    diff.missing.sort((a, b) => a.migration.localeCompare(b.migration));
    diff.errored.sort((a, b) => a.migration.localeCompare(b.migration));

    // Self-enforcement: a migration file with no probe in MIGRATION_PROBES is
    // flagged (never silently skipped) so future migrations cannot regress the
    // checker.
    for (const file of files) {
      if (!MIGRATION_PROBES.some((probe) => probe.file === file)) {
        diff.skipped.push({
          migration: file.slice(0, 4),
          file,
          note: 'no schema probe defined in MIGRATION_PROBES',
        });
      }
    }

    return diff;
  }

  /** Startup warning — logs every missing migration so the gap is visible at boot. */
  async onModuleInit(): Promise<void> {
    try {
      const diff = await this.check();
      this.logDiff(diff);
    } catch (error) {
      this.logger.warn(
        `Migration diff check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private logDiff(diff: MigrationDiff): void {
    if (diff.unavailable) {
      this.logger.warn(
        `Migration diff check skipped — ${diff.unavailableReason ?? 'unavailable'}. Schema state is unverified.`,
      );
      return;
    }

    // Unexpected skips are always flagged (never silently) so the manifest
    // stays in sync — a new migration without a probe cannot slip through.
    // By-design skips (seed-only migrations) are not warned at boot.
    for (const skipped of diff.skipped) {
      if (skipped.expected) continue;
      this.logger.warn(
        `Migration ${skipped.migration} (${skipped.file}) not probed — ${skipped.note}.`,
      );
    }

    if (diff.missing.length === 0 && diff.errored.length === 0) {
      this.logger.log(
        `Schema check: all ${diff.checked} supabase migrations appear applied.`,
      );
      return;
    }

    for (const missing of diff.missing) {
      this.logger.warn(
        `Migration ${missing.migration} NOT applied (${missing.file}) — probe: ${missing.reason}. Apply supabase/migrations/${missing.file}.`,
      );
    }

    for (const errored of diff.errored) {
      this.logger.warn(
        `Migration ${errored.migration} (${errored.file}) could not be verified: ${errored.reason}`,
      );
    }
  }
}
