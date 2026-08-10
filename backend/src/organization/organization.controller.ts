import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { OrganizationService } from './organization.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateMemberTeamDto } from './dto/update-member-team.dto';

@Controller('organization')
@UseGuards(SupabaseAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  getOrganization(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationService.getOrganization(user);
  }

  @Post('invites')
  inviteMember(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationService.inviteMember(user, dto);
  }

  @Patch('members/:memberId/role')
  @HttpCode(HttpStatus.OK)
  updateMemberRole(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationService.updateMemberRole(user, memberId, dto.role);
  }

  @Patch('members/:memberId/team')
  @HttpCode(HttpStatus.OK)
  updateMemberTeam(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberTeamDto,
  ) {
    return this.organizationService.updateMemberTeam(user, memberId, dto.teamId);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationService.removeMember(user, memberId);
  }

  @Get('members/:memberId/sessions')
  listMemberSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationService.listMemberSessions(user, memberId);
  }

  @Delete('members/:memberId/sessions')
  @HttpCode(HttpStatus.OK)
  revokeMemberSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationService.revokeMemberSessions(user, memberId);
  }

  @Delete('members/:memberId/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  revokeMemberSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.organizationService.revokeMemberSession(user, memberId, sessionId);
  }

  @Delete('invites/:inviteId')
  @HttpCode(HttpStatus.OK)
  cancelInvite(
    @CurrentUser() user: CurrentUserPayload,
    @Param('inviteId') inviteId: string,
  ) {
    return this.organizationService.cancelInvite(user, inviteId);
  }
}
