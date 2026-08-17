import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BetterAuthModule } from './auth/better-auth.module';
import { BillingModule } from './billing/billing.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiThrottlerGuard } from './common/guards/api-throttler.guard';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QueueModule } from './queue/queue.module';
import { OrganizationModule } from './organization/organization.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { ScansModule } from './scans/scans.module';
import { SecurityModule } from './security/security.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { SupabaseModule } from './supabase/supabase.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: configService.get<number>('THROTTLE_LIMIT', 60),
        },
      ],
    }),
    QueueModule,
    HealthModule,
    NotificationsModule,
    SupabaseModule,
    WaitlistModule,
    AccountModule,
    AuthModule,
    BetterAuthModule,
    ScansModule,
    ReportsModule,
    RolesModule,
    OrganizationModule,
    BillingModule,
    SecurityModule,
    TelemetryModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
  ],
})
export class AppModule {}
