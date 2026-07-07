import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { AdminService } from './admin.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { ReviewWaitlistDto } from './dto/review-waitlist.dto';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Patch('waitlist/:applicationId')
  @HttpCode(HttpStatus.OK)
  reviewWaitlistApplication(
    @CurrentUser() user: CurrentUserPayload,
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewWaitlistDto,
  ) {
    return this.adminService.reviewWaitlistApplication(applicationId, user, dto);
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
