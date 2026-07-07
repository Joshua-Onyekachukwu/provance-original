import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ApiThrottlerGuard } from './common/guards/api-throttler.guard';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { ScansModule } from './scans/scans.module';
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
    SupabaseModule,
    WaitlistModule,
    AuthModule,
    ScansModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
  ],
})
export class AppModule {}
