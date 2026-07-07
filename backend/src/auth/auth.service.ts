import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async signIn(dto: SignInDto) {
    const client = this.supabaseService.createPublicClient();

    if (!client) {
      return {
        status: 'accepted',
        message:
          'Sign-in handling is being finalized. If your access is approved, continue through your invite or account email.',
      };
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session || !data.user) {
      await this.insertAuditEvent({
        actor_email: dto.email,
        action: 'sign_in_failed',
        entity_type: 'auth_user',
        details: {
          reason: 'invalid_credentials',
        },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.insertAuditEvent({
      actor_email: data.user.email,
      action: 'sign_in_succeeded',
      entity_type: 'auth_user',
      entity_id: data.user.id,
      details: {},
    });

    return {
      status: 'authenticated',
      message: 'Sign-in successful.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      permissions: this.getPermissions(data.user.email),
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type,
      },
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const client = this.supabaseService.createPublicClient();

    if (!client) {
      return {
        status: 'accepted',
        message:
          'If an eligible account exists, password reset instructions will be sent through the configured recovery flow.',
      };
    }

    const redirectTo = this.configService.get<string>(
      'SUPABASE_AUTH_REDIRECT_URL',
    );
    const { error } = await client.auth.resetPasswordForEmail(dto.email, {
      redirectTo,
    });

    if (error) {
      throw new ServiceUnavailableException(
        'Password reset service is temporarily unavailable.',
      );
    }

    await this.insertAuditEvent({
      actor_email: dto.email,
      action: 'password_reset_requested',
      entity_type: 'auth_user',
      details: {},
    });

    return {
      status: 'accepted',
      message:
        'If an eligible account exists, password reset instructions will be sent through the configured recovery flow.',
    };
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const client = this.supabaseService.createPublicClient();

    if (!client) {
      return {
        status: 'accepted',
        message:
          'Password reset confirmation is being finalized. Complete token validation and password update logic before enabling account recovery.',
      };
    }

    const { data, error } = await client.auth.verifyOtp({
      token_hash: dto.token,
      type: 'recovery',
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired recovery token.');
    }

    const updateResult = await client.auth.updateUser({
      password: dto.password,
    });

    if (updateResult.error) {
      throw new ServiceUnavailableException(
        'Password reset service is temporarily unavailable.',
      );
    }

    await this.insertAuditEvent({
      action: 'password_reset_confirmed',
      entity_type: 'auth_user',
      details: {},
    });

    return {
      status: 'updated',
      message: 'Password updated successfully.',
    };
  }

  async refreshSession(dto: RefreshSessionDto) {
    const client = this.supabaseService.createPublicClient();

    if (!client) {
      return {
        status: 'accepted',
        message:
          'Session refresh handling is being finalized. Sign in again if your current session has expired.',
      };
    }

    const { data, error } = await client.auth.refreshSession({
      refresh_token: dto.refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    await this.insertAuditEvent({
      actor_email: data.user.email,
      action: 'session_refreshed',
      entity_type: 'auth_user',
      entity_id: data.user.id,
      details: {},
    });

    return {
      status: 'authenticated',
      message: 'Session refreshed successfully.',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      permissions: this.getPermissions(data.user.email),
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type,
      },
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return {
        status: 'accepted',
        message:
          'Invite acceptance is being finalized. Complete invite lookup, account activation, and session creation before enabling access.',
      };
    }

    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const { data: invite, error: inviteError } = await adminClient
      .from('access_invites')
      .select('id, email, waitlist_application_id, status, expires_at')
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (inviteError) {
      throw new ServiceUnavailableException(
        'Invite verification is temporarily unavailable.',
      );
    }

    if (!invite) {
      await this.insertAuditEvent({
        action: 'invite_acceptance_failed',
        entity_type: 'access_invite',
        details: {
          reason: 'invalid_or_expired_invite',
        },
      });
      throw new UnauthorizedException('Invalid or expired invite.');
    }

    const createUserResult = await adminClient.auth.admin.createUser({
      email: invite.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        full_name: dto.fullName,
      },
    });

    if (createUserResult.error || !createUserResult.data.user) {
      throw new ServiceUnavailableException(
        'Invite activation is temporarily unavailable.',
      );
    }

    const now = new Date().toISOString();
    const createdUser = createUserResult.data.user;

    try {
      const inviteUpdate = await adminClient
        .from('access_invites')
        .update({
          status: 'accepted',
          accepted_at: now,
        })
        .eq('id', invite.id);

      if (inviteUpdate.error) {
        throw new ServiceUnavailableException(
          'Invite activation is temporarily unavailable.',
        );
      }

      if (invite.waitlist_application_id) {
        const waitlistUpdate = await adminClient
          .from('waitlist_applications')
          .update({
            status: 'invite_accepted',
            approved_at: now,
          })
          .eq('id', invite.waitlist_application_id);

        if (waitlistUpdate.error) {
          throw new ServiceUnavailableException(
            'Invite activation is temporarily unavailable.',
          );
        }
      }

      await this.insertAuditEvent(
        {
          actor_email: invite.email,
          action: 'invite_accepted',
          entity_type: 'access_invite',
          entity_id: invite.id,
          details: {
            user_id: createdUser.id,
          },
        },
        true,
      );
    } catch (error) {
      await Promise.allSettled([
        adminClient.auth.admin.deleteUser(createdUser.id),
        adminClient
          .from('access_invites')
          .update({
            status: 'pending',
            accepted_at: null,
          })
          .eq('id', invite.id),
        invite.waitlist_application_id
          ? adminClient
              .from('waitlist_applications')
              .update({
                status: 'waitlist_submitted',
                approved_at: null,
              })
              .eq('id', invite.waitlist_application_id)
          : Promise.resolve(),
      ]);

      throw error instanceof ServiceUnavailableException
        ? error
        : new ServiceUnavailableException(
            'Invite activation is temporarily unavailable.',
          );
    }

    return {
      status: 'active',
      message: 'Invite accepted. Your account is ready to sign in.',
      user: {
        id: createdUser.id,
        email: createdUser.email,
      },
    };
  }

  private async insertAuditEvent(
    entry: {
      actor_email?: string | null;
      action: string;
      entity_type: string;
      entity_id?: string | null;
      details: Record<string, unknown>;
    },
    strict = false,
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const { error } = await adminClient.from('auth_audit_events').insert({
      actor_email: entry.actor_email ?? null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      details: entry.details,
    });

    if (error && strict) {
      throw new ServiceUnavailableException(
        'Audit logging is temporarily unavailable.',
      );
    }
  }

  private getPermissions(email?: string | null) {
    return {
      individual: true,
      team: false,
      admin: this.isAdminEmail(email),
    };
  }

  private isAdminEmail(email?: string | null) {
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
