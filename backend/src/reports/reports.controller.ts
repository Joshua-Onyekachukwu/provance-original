import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  listReports(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.reportsService.listReports(user.id, { page, pageSize });
  }

  @Get(':reportId')
  getReport(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reportId') reportId: string,
  ) {
    return this.reportsService.getReport(user.id, reportId);
  }
}
