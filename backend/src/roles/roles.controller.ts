import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { ReassignMemberDto } from './dto/reassign-member.dto';
import { UpdateRoleScopesDto } from './dto/update-role-scopes.dto';
import { RolesService } from './roles.service';

/**
 * RolesController — the admin Roles & Permissions surface, moved out of the
 * AdminController into its own module (GET /admin/roles now lives here).
 */
@Controller('admin/roles')
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  list() {
    return this.rolesService.list();
  }

  @Patch(':roleId/scopes')
  @HttpCode(HttpStatus.OK)
  updateRoleScopes(
    @CurrentUser() user: CurrentUserPayload,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleScopesDto,
  ) {
    return this.rolesService.updateRoleScopes(user, roleId, dto.scopes);
  }

  @Patch('members/:memberId')
  @HttpCode(HttpStatus.OK)
  reassignMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() dto: ReassignMemberDto,
  ) {
    return this.rolesService.reassignMember(user, memberId, dto.roleId);
  }
}
