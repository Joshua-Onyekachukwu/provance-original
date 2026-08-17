import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCrashReportsDto } from './dto/create-crash-reports.dto';
import { TelemetryService } from './telemetry.service';

function createAdminClient(plan: Array<Record<string, unknown>>) {
  let step = 0;
  const next = () => {
    const result = plan[step++];
    if (result === undefined) {
      throw new Error('Mock query plan exhausted — plan/sequence mismatch');
    }
    return result;
  };

  const builder = {
    from: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    then(resolve: (value: Record<string, unknown>) => void) {
      resolve(next());
      return undefined;
    },
  } as const;

  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createConfigService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    SUPABASE_CRASH_REPORTS_TABLE: 'crash_reports',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createService(client: unknown, config?: ConfigService) {
  return new TelemetryService(
    {
      getAdminClient: jest.fn(() => client),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
  );
}

function dto(records: Array<Record<string, unknown>>) {
  return { errors: records } as unknown as CreateCrashReportsDto;
}

describe('TelemetryService.recordErrors', () => {
  it('upserts the batch on client_id and returns the accepted count', async () => {
    const client = createAdminClient([{ data: null, error: null }]);
    const service = createService(client);

    const result = await service.recordErrors(
      dto([
        {
          client_id: 'cr-abc',
          message: 'boom',
          stack: 'Error: boom',
          component_stack: '\n  at Row (Row.jsx:12)',
          route: '/app/reports',
          user_agent: 'test-agent/1.0',
          user_id: 'user_1',
          email: 'ada@provance.dev',
          meta: { boundary: 'shell' },
          timestamp: '2026-08-08T10:00:00.000Z',
        },
      ]),
    );

    expect(client.from).toHaveBeenCalledWith('crash_reports');
    expect(client.upsert).toHaveBeenCalledWith(
      [
        {
          client_id: 'cr-abc',
          type: 'render_error',
          message: 'boom',
          stack: 'Error: boom',
          component_stack: '\n  at Row (Row.jsx:12)',
          route: '/app/reports',
          user_agent: 'test-agent/1.0',
          user_id: 'user_1',
          email: 'ada@provance.dev',
          meta: { boundary: 'shell' },
          reported_at: '2026-08-08T10:00:00.000Z',
        },
      ],
      { onConflict: 'client_id' },
    );
    expect(result).toEqual({ accepted: 1 });
  });

  it('normalizes absent optional fields to safe defaults', async () => {
    const client = createAdminClient([{ data: null, error: null }]);
    const service = createService(client);

    await service.recordErrors(dto([{ client_id: 'cr-min' }]));

    expect(client.upsert).toHaveBeenCalledWith(
      [
        {
          client_id: 'cr-min',
          type: 'render_error',
          message: '',
          stack: null,
          component_stack: null,
          route: null,
          user_agent: null,
          user_id: null,
          email: null,
          meta: {},
          reported_at: null,
        },
      ],
      { onConflict: 'client_id' },
    );
  });

  it('accepts an empty batch without touching the database', async () => {
    const client = createAdminClient([]);
    const service = createService(client);

    const result = await service.recordErrors(dto([]));

    expect(result).toEqual({ accepted: 0 });
    expect(client.from).not.toHaveBeenCalled();
  });

  it('throws 503 when Supabase is not configured', async () => {
    const service = createService(null);

    await expect(
      service.recordErrors(dto([{ client_id: 'cr-abc' }])),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws 503 when the insert fails (client keeps its buffer to retry)', async () => {
    const client = createAdminClient([
      { data: null, error: { message: 'boom' } },
    ]);
    const service = createService(client);

    await expect(
      service.recordErrors(dto([{ client_id: 'cr-abc' }])),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('honors a custom table name from config', async () => {
    const config = createConfigService({
      SUPABASE_CRASH_REPORTS_TABLE: 'custom_crashes',
    });
    const client = createAdminClient([{ data: null, error: null }]);
    const service = createService(client, config);

    await service.recordErrors(dto([{ client_id: 'cr-abc' }]));

    expect(client.from).toHaveBeenCalledWith('custom_crashes');
  });
});
