import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { AccountService } from './account.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('account')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.accountService.getCurrentViewer(user);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(user, dto);
  }
}
