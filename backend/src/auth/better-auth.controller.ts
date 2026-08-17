import {
  All,
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './better-auth.config';
import { betterAuthStatus } from './better-auth-status';

/**
 * BetterAuthController — mounts the Better Auth handler under the v1 prefix
 * (global prefix v1 → /v1/better-auth/*) as a NestJS catch-all instead of a
 * raw app.use in main.ts, so the provider's routes flow through the same
 * pipeline as the rest of the API.
 *
 * Body handling: Nest's express.json() consumes the stream before this
 * controller runs; better-call's node adapter explicitly falls back to the
 * pre-parsed `req.body` (adapters/node/request.mjs), so JSON bodies from the
 * better-auth client arrive intact.
 *
 * Gating: the whole surface is behind USE_BETTER_AUTH (default off). With the
 * flag off, /ok reports the state and every other route 404s — the live
 * GoTrue flow at /v1/auth/* is untouched either way.
 */
@Controller('better-auth')
export class BetterAuthController {
  /**
   * Provider health check — always answers (200), reporting exactly which
   * gate is missing when the provider is not ready: USE_BETTER_AUTH off, or
   * DATABASE_URL missing (stateless).
   */
  @Get('ok')
  getOk() {
    const ready = betterAuthStatus.enabled && betterAuthStatus.database === 'connected';
    return {
      ok: ready,
      provider: 'better-auth',
      basePath: '/v1/better-auth',
      enabled: betterAuthStatus.enabled,
      database: betterAuthStatus.database,
      detail: ready
        ? 'email/password + session + 2FA plugins live'
        : !betterAuthStatus.enabled
          ? 'USE_BETTER_AUTH is not enabled'
          : 'USE_BETTER_AUTH=true but DATABASE_URL is missing (stateless)',
    };
  }

  /**
   * Catch-all — every /v1/better-auth/* route not handled above (sign-in,
   * sign-up, session, two-factor, org, api-key) delegates to better-auth's
   * node handler, which writes the response directly (no passthrough).
   */
  @All('*')
  async handle(@Req() req: Request, @Res() res: Response) {
    if (!betterAuthStatus.enabled) {
      throw new NotFoundException('Better Auth is not enabled.');
    }

    await toNodeHandler(auth)(req, res);
  }
}
