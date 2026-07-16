import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

type ProfileRow = {
  user_id: string;
  email: string;
  display_name: string;
  organization: string | null;
  role_title: string | null;
  default_workspace: 'individual' | 'team';
  email_notifications: boolean;
  account_role: 'member' | 'admin';
  team_access: boolean;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class AccountService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getCurrentViewer(user: CurrentUserPayload) {
    const profile = await this.ensureProfile(user);

    return {
      status: 'authenticated',
      user: {
        id: user.id,
        email: user.email,
      },
      permissions: this.buildPermissions(profile),
      profile: this.serializeProfile(profile),
    };
  }

  async updateProfile(user: CurrentUserPayload, dto: UpdateProfileDto) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const currentProfile = await this.ensureProfile(user);
    const nextDefaultWorkspace =
      dto.defaultWorkspace ?? currentProfile.default_workspace;

    if (nextDefaultWorkspace === 'team' && !currentProfile.team_access) {
      throw new BadRequestException(
        'Team workspace access is not enabled for this account.',
      );
    }

    const updates = {
      display_name:
        typeof dto.displayName === 'string'
          ? dto.displayName.trim() || currentProfile.display_name
          : currentProfile.display_name,
      organization:
        typeof dto.organization === 'string'
          ? dto.organization.trim() || null
          : currentProfile.organization,
      role_title:
        typeof dto.roleTitle === 'string'
          ? dto.roleTitle.trim() || null
          : currentProfile.role_title,
      default_workspace: nextDefaultWorkspace,
      email_notifications:
        typeof dto.emailNotifications === 'boolean'
          ? dto.emailNotifications
          : currentProfile.email_notifications,
      account_role: this.resolveAccountRole(
        user.email,
        currentProfile.account_role,
      ),
      team_access: currentProfile.team_access,
      email: user.email || currentProfile.email,
    };

    const { data, error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to update profile.');
    }

    const profile = data as ProfileRow;

    return {
      status: 'updated',
      profile: this.serializeProfile(profile),
      permissions: this.buildPermissions(profile),
    };
  }

  async ensureProfile(user: CurrentUserPayload): Promise<ProfileRow> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to load profile.');
    }

    const resolvedRole = this.resolveAccountRole(
      user.email,
      (data as ProfileRow | null)?.account_role ?? null,
    );

    if (!data) {
      const insertPayload = this.buildDefaultProfileRow(user, resolvedRole);
      const inserted = await adminClient
        .from('profiles')
        .insert(insertPayload)
        .select('*')
        .single();

      if (inserted.error || !inserted.data) {
        throw new ServiceUnavailableException('Failed to initialize profile.');
      }

      return inserted.data as ProfileRow;
    }

    const profile = data as ProfileRow;
    const requiresRepair =
      profile.email !== (user.email || profile.email) ||
      profile.account_role !== resolvedRole ||
      !profile.display_name?.trim();

    if (!requiresRepair) {
      return profile;
    }

    const repaired = await adminClient
      .from('profiles')
      .update({
        email: user.email || profile.email,
        display_name: profile.display_name?.trim()
          ? profile.display_name
          : this.buildDefaultDisplayName(user.email),
        account_role: resolvedRole,
      })
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (repaired.error || !repaired.data) {
      throw new ServiceUnavailableException('Failed to repair profile.');
    }

    return repaired.data as ProfileRow;
  }

  private buildPermissions(profile: ProfileRow) {
    return {
      individual: true,
      team: profile.team_access,
      admin: profile.account_role === 'admin',
    };
  }

  private serializeProfile(profile: ProfileRow) {
    return {
      displayName: profile.display_name,
      organization: profile.organization || '',
      roleTitle: profile.role_title || '',
      defaultWorkspace:
        profile.default_workspace === 'team' && profile.team_access
          ? 'team'
          : 'individual',
      emailNotifications: profile.email_notifications,
      accountRole: profile.account_role,
      teamAccess: profile.team_access,
    };
  }

  private buildDefaultProfileRow(
    user: CurrentUserPayload,
    accountRole: 'member' | 'admin',
  ) {
    return {
      user_id: user.id,
      email: user.email || '',
      display_name: this.buildDefaultDisplayName(user.email),
      organization: null,
      role_title: null,
      default_workspace: 'individual' as const,
      email_notifications: true,
      account_role: accountRole,
      team_access: false,
    };
  }

  private buildDefaultDisplayName(email?: string) {
    const localPart = typeof email === 'string' ? email.split('@')[0] : '';

    const normalizedName = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return normalizedName || 'Provance User';
  }

  private resolveAccountRole(
    email?: string,
    existingRole?: string | null,
  ): 'member' | 'admin' {
    if (this.isAdminEmail(email)) {
      return 'admin';
    }

    return existingRole === 'admin' ? 'admin' : 'member';
  }

  private isAdminEmail(email?: string) {
    if (!email) {
      return false;
    }

    const configuredEmails =
      this.configService.get<string>('ADMIN_EMAILS')?.split(',') ?? [];

    return configuredEmails
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .includes(email.trim().toLowerCase());
  }
}
