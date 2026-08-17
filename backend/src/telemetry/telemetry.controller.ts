import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateCrashReportsDto } from './dto/create-crash-reports.dto';
import { TelemetryService } from './telemetry.service';

/**
 * Telemetry ingestion — public and throttled (the waitlist pattern): crashes
 * must be reportable from any surface, including unauthenticated public pages,
 * and the throttler is the abuse guard. The frontend attaches the bearer
 * token when a session exists; the endpoint never requires one.
 */
@Controller('telemetry')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('errors')
  @HttpCode(HttpStatus.ACCEPTED)
  recordErrors(@Body() dto: CreateCrashReportsDto) {
    return this.telemetryService.recordErrors(dto);
  }
}
