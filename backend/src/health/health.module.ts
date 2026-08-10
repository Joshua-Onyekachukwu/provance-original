import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MigrationHealthService } from './migration-health.service';

@Module({
  controllers: [HealthController],
  providers: [MigrationHealthService],
  exports: [MigrationHealthService],
})
export class HealthModule {}
