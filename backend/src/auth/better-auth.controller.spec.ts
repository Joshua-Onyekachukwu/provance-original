import { NotFoundException } from '@nestjs/common';
import { BetterAuthController } from './better-auth.controller';
import { resolveBetterAuthStatus } from './better-auth-status';

// ---------------------------------------------------------------------------
// /v1/better-auth gating. The controller's catch-all needs the real
// better-auth ESM package, which the backend jest (CJS/ts-jest) runner cannot
// parse — so the ESM modules are mocked and the gate logic itself is tested
// through the pure better-auth-status module.
// ---------------------------------------------------------------------------

jest.mock('better-auth/node', () => ({
  toNodeHandler: jest.fn(() => jest.fn()),
}));

jest.mock('./better-auth.config', () => ({
  auth: {},
}));

describe('resolveBetterAuthStatus (the gate /ok reports)', () => {
  it('is disabled when USE_BETTER_AUTH is unset, regardless of DATABASE_URL', () => {
    const status = resolveBetterAuthStatus({
      USE_BETTER_AUTH: undefined,
      DATABASE_URL: 'postgresql://dev:dev@localhost:5432/postgres',
    });

    expect(status).toEqual({ enabled: false, database: 'connected' });
  });

  it('is disabled when the flag is off', () => {
    const status = resolveBetterAuthStatus({
      USE_BETTER_AUTH: 'false',
      DATABASE_URL: 'postgresql://dev:dev@localhost:5432/postgres',
    });

    expect(status.enabled).toBe(false);
  });

  it('is enabled-but-stateless when the flag is on but DATABASE_URL is missing', () => {
    const status = resolveBetterAuthStatus({
      USE_BETTER_AUTH: 'true',
      DATABASE_URL: undefined,
    });

    expect(status).toEqual({ enabled: true, database: 'missing' });
  });

  it('is ready only when the flag is on AND DATABASE_URL is present', () => {
    const status = resolveBetterAuthStatus({
      USE_BETTER_AUTH: 'true',
      DATABASE_URL: 'postgresql://dev:dev@localhost:5432/postgres',
    });

    expect(status).toEqual({ enabled: true, database: 'connected' });
  });
});

describe('BetterAuthController', () => {
  it('/ok reports the module-level state with the basePath contract', () => {
    const controller = new BetterAuthController();
    const result = controller.getOk();

    // The statically-imported module evaluated with the default test env
    // (USE_BETTER_AUTH unset) — the shape and gate naming are what matter.
    expect(result.provider).toBe('better-auth');
    expect(result.basePath).toBe('/v1/better-auth');
    expect(typeof result.ok).toBe('boolean');
    expect(typeof result.enabled).toBe('boolean');
    expect(['connected', 'missing']).toContain(result.database);
    expect(result.detail).toContain('USE_BETTER_AUTH');
  });

  it('catch-all 404s when the flag is off', async () => {
    const controller = new BetterAuthController();

    await expect(
      controller.handle({} as never, {} as never),
    ).rejects.toThrow(NotFoundException);
  });
});
