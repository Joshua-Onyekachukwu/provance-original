import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountService } from '../account/account.service';
import { auditSeverity } from '../common/audit-severity';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { decodeJwtPayloadSid } from '../common/jwt-sid.util';
import { SecurityService } from '../security/security.service';
import type { SessionMeta } from '../security/session-meta.util';
import { SupabaseService } from '../supabase/supabase.service';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly orgsTable: string;
  private readonly orgMembersTable: string;
  private readonly orgInvitesTable: string;
  private readonly auditTable: string;

  constructor(
    private readonly accountService: AccountService,
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly securityService: SecurityService,
  ) {
    // Org tables mirror the organization module (0005_organization.sql) so the
    // invite-accept path joins the same roster the org endpoints manage.
    this.orgsTable = this.configService.get<string>(
      'SUPABASE_ORGANIZATIONS_TABLE',
      'organizations',
    );
    this.orgMembersTable = this.configService.get<string>(
      'SUPABASE_ORGANIZATION_MEMBERS_TABLE',
      'organization_members',
    );
    this.orgInvitesTable = this.configService.get<string>(
      'SUPABASE_ORGANIZATION_INVITES_TABLE',
      'organization_invites',
    );
    this.auditTable =
      this.configService.get<string>('SUPABASE_AUDIT_LOGS_TABLE') ||
      'audit_logs';
  }

  async getCurrentSession(user: CurrentUserPayload) {
    return this.accountService.getCurrentViewer(user);
  }

  async signIn(dto: SignInDto, meta?: SessionMeta) {
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

    // Ledger the session so the Security page can list and revoke it. Skip
    // when the sid claim is unavailable rather than collapsing every session
    // into a sentinel row that could never match the guard's decoded sid.
    const authSessionId = decodeJwtPayloadSid(data.session.access_token);

    if (authSessionId) {
      await this.securityService.recordSession({
        userId: data.user.id,
        authSessionId,
        refreshToken: data.session.refresh_token,
        meta,
      });
    }

    const viewerState = await this.accountService.getCurrentViewer({
      id: data.user.id,
      email: data.user.email ?? undefined,
    });

    return {
      status: 'authenticated',
      message: 'Sign-in successful.',
      user: viewerState.user,
      permissions: viewerState.permissions,
      profile: viewerState.profile,
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

    // A password reset should invalidate tracked sessions — wipe the ledger.
    if (data.user) {
      await this.securityService.deleteUserSessions(data.user.id);
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

  async refreshSession(
    dto: RefreshSessionDto,
    meta?: SessionMeta,
    tokenSource: 'cookie' | 'body' = 'body',
  ) {
    const client = this.supabaseService.createPublicClient();

    if (!client) {
      return {
        status: 'accepted',
        message:
          'Session refresh handling is being finalized. Sign in again if your current session has expired.',
      };
    }

    if (!dto.refreshToken) {
      throw new UnauthorizedException('No session credential was provided.');
    }

    const { data, error } = await client.auth.refreshSession({
      refresh_token: dto.refreshToken,
    });

    // Supabase rejected the refresh token — this is exactly what a replayed
    // rotated token (token theft) produces. Record it in the admin audit
    // trail before rejecting: only the SHA-256 hash of the presented token
    // is stored, never the raw value, and the write is best-effort so the
    // rejection itself can never be blocked by the audit insert.
    if (error) {
      await this.recordRejectedRefresh(dto.refreshToken, error, tokenSource, meta);
      throw new UnauthorizedException('Invalid or expired session.');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException('Invalid or expired session.');
    }

    await this.insertAuditEvent({
      actor_email: data.user.email,
      action: 'session_refreshed',
      entity_type: 'auth_user',
      entity_id: data.user.id,
      details: {},
    });

    // Rotation keeps the same auth session id, so this bumps last_active_at
    // on the existing ledger row (and stores the fresh token hash).
    const authSessionId = decodeJwtPayloadSid(data.session.access_token);

    if (authSessionId) {
      await this.securityService.recordSession({
        userId: data.user.id,
        authSessionId,
        refreshToken: data.session.refresh_token,
        meta,
      });
    }

    const viewerState = await this.accountService.getCurrentViewer({
      id: data.user.id,
      email: data.user.email ?? undefined,
    });

    return {
      status: 'authenticated',
      message: 'Session refreshed successfully.',
      user: viewerState.user,
      permissions: viewerState.permissions,
      profile: viewerState.profile,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        tokenType: data.session.token_type,
      },
    };
  }

  async signOut(refreshToken: string | null) {
    if (refreshToken) {
      // Burn the refresh token server-side: refresh rotation consumes the
      // old token (Supabase invalidates it), and we discard the replacement.
      const client = this.supabaseService.createPublicClient();

      if (client) {
        try {
          await client.auth.refreshSession({
            refresh_token: refreshToken,
          });
        } catch {
          // The token was already invalid or expired; nothing to revoke.
        }
      }
    }

    // Drop the ledger row for this session (matched by refresh-token hash).
    if (refreshToken) {
      await this.securityService.deleteSessionByRefreshHash(refreshToken);
    }

    await this.insertAuditEvent({
      action: 'sign_out',
      entity_type: 'auth_user',
      details: {
        refresh_token_present: Boolean(refreshToken),
      },
    });

    return {
      status: 'signed_out',
      message: 'You have been signed out.',
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

    // ── 1. Organization invite (hashed token) — joins the org roster ───────
    // POST /organization/invites persists only the SHA-256 of the raw token
    // (migration 0015), so a leaked invites table never exposes usable tokens.
    // Acceptance hashes the submitted token and matches token_hash; the raw
    // token reached the invitee only via the share/email link.
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const { data: orgInvite, error: orgInviteError } = await adminClient
      .from(this.orgInvitesTable)
      .select('id, email, role, team_id, organization_id, status, expires_at')
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (orgInviteError) {
      throw new ServiceUnavailableException(
        'Invite verification is temporarily unavailable.',
      );
    }

    if (orgInvite) {
      return this.acceptOrganizationInvite(adminClient, orgInvite, dto);
    }

    // ── 2. Waitlist access invite (hashed token) — existing flow ───────────
    // (tokenHash was already computed above for the org-invite lookup.)
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

  /**
   * acceptOrganizationInvite — activates an invite issued by the organization
   * module (POST /organization/invites). Mirrors the access_invites flow's
   * rollback semantics: any failure after user creation deletes the user and
   * restores the invite status, so a half-activated account never persists.
   */
  private async acceptOrganizationInvite(
    adminClient: NonNullable<ReturnType<SupabaseService['getAdminClient']>>,
    invite: {
      id: string;
      email: string;
      role: string;
      team_id: string | null;
      organization_id: string;
    },
    dto: AcceptInviteDto,
  ) {
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

    const createdUser = createUserResult.data.user;

    try {
      // Seat guard: invite creation seat-checks, but seats may have filled in
      // the meantime — mirror the organization service's plan enforcement.
      const { count, error: countError } = await adminClient
        .from(this.orgMembersTable)
        .select('user_id', { count: 'exact', head: true })
        .eq('organization_id', invite.organization_id)
        .eq('status', 'active');

      if (countError) {
        throw new ServiceUnavailableException(
          'Failed to check workspace seats.',
        );
      }

      const { data: org } = await adminClient
        .from(this.orgsTable)
        .select('seats')
        .eq('id', invite.organization_id)
        .maybeSingle();

      if ((count ?? 0) >= (org?.seats ?? 1)) {
        throw new BadRequestException(
          'This workspace has no seats left on its current plan.',
        );
      }

      const membershipInsert = await adminClient
        .from(this.orgMembersTable)
        .insert({
          organization_id: invite.organization_id,
          user_id: createdUser.id,
          role: invite.role,
          team_id: invite.team_id,
          status: 'active',
        });

      if (membershipInsert.error) {
        // PK is (organization_id, user_id) — an email added as a member
        // between invite creation and acceptance surfaces as a unique
        // violation, so name it rather than surfacing a generic 503.
        if (membershipInsert.error.code === '23505') {
          throw new BadRequestException(
            'This email is already a member of the workspace.',
          );
        }
        throw new ServiceUnavailableException(
          'Failed to join the organization roster.',
        );
      }

      const inviteUpdate = await adminClient
        .from(this.orgInvitesTable)
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      if (inviteUpdate.error) {
        throw new ServiceUnavailableException(
          'Failed to mark the invite accepted.',
        );
      }

      await this.insertAuditEvent(
        {
          actor_email: invite.email,
          action: 'invite_accepted',
          entity_type: 'organization_invite',
          entity_id: invite.id,
          details: {
            user_id: createdUser.id,
            organization_id: invite.organization_id,
          },
        },
        true,
      );
    } catch (error) {
      await Promise.allSettled([
        adminClient.auth.admin.deleteUser(createdUser.id),
        adminClient
          .from(this.orgInvitesTable)
          .update({ status: 'pending' })
          .eq('id', invite.id),
      ]);

      throw error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
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

  /**
   * Record a rejected refresh token in the admin audit trail (audit_logs).
   *
   * Supabase rejects a refresh token when it was already rotated (the replay
   * signature of token theft), expired, or was never issued. The event is
   * high-severity so it surfaces on the Admin Audit Logs page; only a
   * SHA-256 hash of the presented token is stored so a leaked table never
   * leaks the credential. The write is best-effort — a missing audit_logs
   * table (migration 0008 not applied) must never break the rejection path.
   */
  private async recordRejectedRefresh(
    presentedToken: string,
    supabaseError: { message?: string; status?: number },
    tokenSource: 'cookie' | 'body',
    meta?: SessionMeta,
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const message = supabaseError.message ?? '';
    // The known replay/revoked-family signature from GoTrue — flagged in the
    // details so the admin can distinguish it from a plain expiry.
    const reuseSuspected = message.includes('Refresh Token Not Found');

    const { error } = await adminClient.from(this.auditTable).insert({
      actor_email: 'system',
      action: 'refresh_token_rejected',
      severity: auditSeverity('refresh_token_rejected'),
      entity_type: 'auth_session',
      entity_id: null,
      details: {
        refresh_token_hash: createHash('sha256')
          .update(presentedToken)
          .digest('hex'),
        reuse_suspected: reuseSuspected,
        error: message.slice(0, 300),
        status: supabaseError.status ?? null,
        token_source: tokenSource,
        device: meta?.device ?? null,
        ip_address: meta?.ipAddress ?? null,
        location: meta?.location ?? null,
      },
    });

    if (error) {
      this.logger.warn(
        `Refresh-token rejection audit write failed: ${error.message}`,
      );
    }
  }
}
