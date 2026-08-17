import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSecuritySettingDto } from './dto/update-security-setting.dto';
import { SecurityService } from './security.service';

@Controller('security')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('settings')
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.securityService.getSettings(user, user.sid);
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.securityService.listSessions(user, user.sid);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  revokeSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
  ) {
    return this.securityService.revokeSession(user, sessionId, user.sid);
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  updateSetting(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSecuritySettingDto,
  ) {
    return this.securityService.updateSetting(user, dto.key, dto.value);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.securityService.changePassword(
      user,
      { currentPassword: dto.currentPassword, newPassword: dto.newPassword },
      user.sid,
    );
  }
}
