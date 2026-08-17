import { Module } from '@nestjs/common';
import { BetterAuthController } from './better-auth.controller';

/**
 * BetterAuthModule — the /v1/better-auth surface (flag-gated in the
 * controller/config). Kept separate from AuthModule (the GoTrue /v1/auth/*
 * flow) so Option A can be retired without touching the live provider.
 */
@Module({
  controllers: [BetterAuthController],
})
export class BetterAuthModule {}
