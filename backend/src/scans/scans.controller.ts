import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { InitiateScanDto } from './dto/initiate-scan.dto';
import { ScansService } from './scans.service';

@Controller('scans')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  initiateScan(@CurrentUser() user: CurrentUserPayload, @Body() dto: InitiateScanDto) {
    return this.scansService.initiateScan(user.id, dto);
  }

  @Post(':scanId/submit')
  @HttpCode(HttpStatus.ACCEPTED)
  submitScan(@CurrentUser() user: CurrentUserPayload, @Param('scanId') scanId: string) {
    return this.scansService.submitScan(user.id, scanId);
  }

  @Get()
  listScans(@CurrentUser() user: CurrentUserPayload) {
    return this.scansService.listScans(user.id);
  }

  @Get(':scanId')
  getScan(@CurrentUser() user: CurrentUserPayload, @Param('scanId') scanId: string) {
    return this.scansService.getScan(user.id, scanId);
  }
}
