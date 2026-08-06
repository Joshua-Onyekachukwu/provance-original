import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Patch,
  Query,
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

  @Get('activity')
  getActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query('category', new DefaultValuePipe('all')) category: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.accountService.getActivity(user, { category, page, pageSize });
  }
}
