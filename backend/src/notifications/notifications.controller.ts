import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { ParseIntStrictPipe } from '../common/pipes/parse-int-strict.pipe';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page', new ParseIntStrictPipe(), new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new ParseIntStrictPipe(), new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.notificationsService.list(user, { page, pageSize });
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(user, id);
  }
}
