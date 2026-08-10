import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { AdminService } from './admin.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { FailJobDto } from './dto/fail-job.dto';
import { ReviewWaitlistDto } from './dto/review-waitlist.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('jobs')
  listJobs(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('pageSize', new DefaultValuePipe(500), ParseIntPipe) pageSize = 500,
  ) {
    return this.adminService.listJobs({ status, page, pageSize });
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  retryJob(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.adminService.retryJob(id, {
      id: user.id,
      email: user.email,
    });
  }

  @Post('jobs/:id/fail')
  @HttpCode(HttpStatus.OK)
  failJob(
    @Param('id') id: string,
    @Body() dto: FailJobDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.failJob(id, dto.reason, {
      id: user.id,
      email: user.email,
    });
  }

  @Get('reports')
  listAdminReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('team') team?: string,
  ) {
    return this.adminService.listAdminReports({ page, pageSize, team });
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('team') team?: string,
  ) {
    return this.adminService.listUsers({ page, pageSize, team });
  }

  @Get('organizations')
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get('analytics')
  getAnalytics(@Query('team') team?: string) {
    return this.adminService.getAnalytics({ team });
  }

  @Get('feature-flags')
  listFeatureFlags() {
    return this.adminService.listFeatureFlags();
  }

  @Patch('feature-flags/:key')
  @HttpCode(HttpStatus.OK)
  updateFeatureFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return this.adminService.updateFeatureFlag(key, dto.enabled);
  }

  @Get('audit-logs')
  listAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(100), ParseIntPipe) pageSize: number,
    @Query('severity') severity?: string,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listAuditLogs({
      page,
      pageSize,
      severity,
      actor,
      action,
      resourceType,
      search,
    });
  }

  @Get('monitoring')
  getMonitoring() {
    return this.adminService.getMonitoring();
  }

  @Patch('waitlist/:applicationId')
  @HttpCode(HttpStatus.OK)
  reviewWaitlistApplication(
    @CurrentUser() user: CurrentUserPayload,
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewWaitlistDto,
  ) {
    return this.adminService.reviewWaitlistApplication(
      applicationId,
      user,
      dto,
    );
  }

  @Post('waitlist/:applicationId/invite')
  @HttpCode(HttpStatus.CREATED)
  createInvite(
    @CurrentUser() user: CurrentUserPayload,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.adminService.createInvite(applicationId, user, dto);
  }
}
