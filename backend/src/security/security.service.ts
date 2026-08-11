import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { SessionMeta } from './session-meta.util';

type SessionRow = {
  id: string;
  user_id: string;
  auth_session_id: string;
  refresh_token_hash: string | null;
  device: string;
  ip_address: string | null;
  location: string | null;
  created_at: string;
  last_active_at: string;
};

type SecurityControls = {
  twoFactorAuth: { enabled: boolean; method: string | null; updatedAt: string | null };
  emailVerification: { verified: boolean; verifiedAt: string | null };
  sessionTimeoutMinutes: number;
  notifyOnNewDevice: boolean;
  notifyOnPasswordChange: boolean;
};

type SessionView = {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  isCurrent: boolean;
  /**
   * Trust signal: true when the device's FIRST appearance in this user's
   * ledger is recent (within NEW_DEVICE_WINDOW_DAYS) — i.e. the device is
   * new to the account. Unknown-device rows never badge. Mirrors the mock's
   * computeNewDeviceFlags so mock and real modes agree.
   */
  isNewDevice: boolean;
  /** The user's workspace team — resolves the tag the UI badges. */
  teamId: string | null;
};

/** A session on a device first seen within this window is badged 'New device'. */
const NEW_DEVICE_WINDOW_DAYS = 7;

/** A device label meaningful enough to badge — never the DB 'Unknown device' default. */
function isMeaningfulDevice(device: string): boolean {
  const trimmed = (device || '').trim();
  return trimmed !== '' && trimmed !== 'Unknown device';
}

type ListSessionsOptions = {
  /** List another user's ledger rows (org-admin view) instead of the caller's. */
  targetUserId?: string;
  /** Team to tag the rows with — the org service passes the membership's team. */
  teamId?: string | null;
};

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * isMissingRelationError — true when a PostgREST error means the ledger table
 * does not exist yet (migration 0010 not applied). These errors degrade to
 * defaults/empty rather than surfacing 503s, matching the billing plan
 * fallback so fresh DBs never break auth flows.
 */
function isMissingRelationError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: string }).message)
      : '';
  return (
    message.includes('Could not find the table') ||
    message.includes('relation') ||
    message.includes('PGRST205') ||
    message.includes('does not exist')
  );
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly sessionsTable: string;
  private readonly settingsTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.sessionsTable = this.configService.get<string>(
      'SUPABASE_USER_SESSIONS_TABLE',
      'user_sessions',
    );
    this.settingsTable = this.configService.get<string>(
      'SUPABASE_USER_SECURITY_SETTINGS_TABLE',
      'user_security_settings',
    );
  }

  // -------------------------------------------------------------------------
  // Session ledger
  // -------------------------------------------------------------------------

  /**
   * recordSession — upserts the user's session row keyed by
   * (user_id, auth_session_id). The `sid` claim survives refresh rotation, so
   * a refresh simply bumps last_active_at; only a SHA-256 hash of the refresh
   * token is stored. Best-effort: a missing table (migration not applied)
   * must never break sign-in.
   */
  async recordSession(input: {
    userId: string;
    authSessionId: string;
    refreshToken?: string | null;
    meta?: SessionMeta;
  }): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const device = input.meta?.device || 'Unknown device';
    const ipAddress = input.meta?.ipAddress || null;

    // New-device detection runs BEFORE the upsert: a (user, device, ip) combo
    // that has no ledger row yet is a first-time sign-in from that surface.
    // Refresh keeps the same auth_session_id and its existing row, so it
    // matches and never re-triggers.
    const isNewDevice = await this.isNewDeviceCombo(
      input.userId,
      device,
      ipAddress,
    );

    const { error } = await adminClient
      .from(this.sessionsTable)
      .upsert(
        {
          user_id: input.userId,
          auth_session_id: input.authSessionId,
          refresh_token_hash: input.refreshToken
            ? hashRefreshToken(input.refreshToken)
            : null,
          device,
          ip_address: ipAddress,
          location: input.meta?.location || null,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,auth_session_id' },
      );

    // The ledger is bookkeeping — sign-in/refresh never fail on a write error.
    void error;

    if (isNewDevice) {
      await this.handleNewDeviceSignIn(input.userId, {
        device,
        ipAddress,
        location: input.meta?.location || null,
      });
    }
  }

  /**
   * deleteSessionByRefreshHash — removes the ledger row matching a refresh
   * token (used on sign-out, where only the cookie value is available).
   */
  async deleteSessionByRefreshHash(refreshToken: string): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const { error } = await adminClient
      .from(this.sessionsTable)
      .delete()
      .eq('refresh_token_hash', hashRefreshToken(refreshToken));

    void error;
  }

  /**
   * deleteUserSessions — wipes the whole ledger for a user (password reset).
   * Best-effort like the other ledger writes.
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const { error } = await adminClient
      .from(this.sessionsTable)
      .delete()
      .eq('user_id', userId);

    void error;
  }

  /**
   * listSessions — the active-session surface for the Security page and the
   * org-admin member-session view. The session matching the current access
   * token's `sid` is marked isCurrent so the UI disables its Revoke action.
   * Every row is tagged with the user's team (`teamId`) so the UI can badge
   * the ledger. Degrades to [] when the table is not applied yet.
   *
   * opts.targetUserId lists another user's rows (org view — the org service
   * resolves the membership first and passes opts.teamId so no extra query is
   * needed); with no override the caller's own team is resolved best-effort.
   */
  async listSessions(
    user: CurrentUserPayload,
    currentAuthSessionId?: string,
    opts: ListSessionsOptions = {},
  ): Promise<SessionView[]> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return [];
    }

    const scopedUserId = opts.targetUserId ?? user.id;

    const { data, error } = await adminClient
      .from(this.sessionsTable)
      .select(
        'id,user_id,auth_session_id,device,ip_address,location,created_at,last_active_at',
      )
      .eq('user_id', scopedUserId)
      .order('last_active_at', { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        return [];
      }
      throw new ServiceUnavailableException('Failed to load active sessions.');
    }

    const teamId =
      opts.teamId !== undefined
        ? opts.teamId
        : await this.resolveUserTeam(scopedUserId);

    const rows = (data ?? []) as SessionRow[];

    // Trust signal: a session is a 'New device' when its device's first
    // appearance in this user's ledger is within NEW_DEVICE_WINDOW_DAYS.
    // Devices without a meaningful label (empty / 'Unknown device') never
    // badge. Only created_at ordering matters — a device used for weeks then
    // revisited stays known, while a brand-new device badges for its first
    // week.
    const deviceFirstSeen = new Map<string, number>();
    const cutoff = Date.now() - NEW_DEVICE_WINDOW_DAYS * 86_400_000;
    for (const row of rows) {
      if (!isMeaningfulDevice(row.device)) continue;
      const firstSeen = new Date(row.created_at).getTime();
      if (Number.isNaN(firstSeen)) continue;
      const known = deviceFirstSeen.get(row.device);
      if (known === undefined || firstSeen < known) {
        deviceFirstSeen.set(row.device, firstSeen);
      }
    }

    return rows.map((row) => ({
      id: row.id,
      device: row.device,
      location: row.location || 'Unknown',
      ipAddress: row.ip_address || 'Unknown',
      lastActiveAt: row.last_active_at,
      isCurrent: Boolean(currentAuthSessionId) && row.auth_session_id === currentAuthSessionId,
      isNewDevice:
        isMeaningfulDevice(row.device) &&
        (deviceFirstSeen.get(row.device) ?? 0) >= cutoff,
      teamId,
    }));
  }

  /**
   * revokeSession — revokes a user's session server-side and drops the ledger
   * row. Server-side revocation uses the GoTrue admin API
   * (DELETE /auth/v1/admin/users/{user_id}/sessions/{session_id}) so the
   * session's refresh token is invalidated in Supabase auth — the device is
   * signed out immediately, exactly what the Security page promises.
   */
  async revokeSession(
    user: CurrentUserPayload,
    sessionId: string,
    currentAuthSessionId?: string,
  ): Promise<{ ok: true; sessionId: string }> {
    const row = await this.getLedgerRow(user.id, sessionId);
    this.assertNotCurrentSession(row, user.id, currentAuthSessionId);
    await this.revokeLedgerRow(row, user);
    return { ok: true, sessionId };
  }

  /**
   * revokeSessionForUser — org-admin revocation of another member's session
   * (Organization page). The row is scoped to the target user; the only
   * protection beyond the shared guards is that an admin cannot revoke their
   * OWN current session through this surface (targetUserId === actor.id). The
   * audit event records the target so the org trail is attributable.
   */
  async revokeSessionForUser(
    actor: CurrentUserPayload,
    targetUserId: string,
    sessionId: string,
    currentAuthSessionId?: string,
  ): Promise<{ ok: true; sessionId: string }> {
    const row = await this.getLedgerRow(targetUserId, sessionId);
    this.assertNotCurrentSession(row, actor.id, currentAuthSessionId);
    // Org-admin path: distinct action so the admin's Activity feed and the
    // admin audit trail surface it as a member_session_revoked event, not a
    // self-service session_revoked.
    await this.revokeLedgerRow(row, actor, { targetUserId }, 'member_session_revoked');
    return { ok: true, sessionId };
  }

  /**
   * getLedgerRow — resolves one ledger row scoped to a user, mapping a
   * missing migration / row to a 404 the way revokeSession always has.
   */
  private async getLedgerRow(
    userId: string,
    sessionId: string,
  ): Promise<{ id: string; user_id: string; auth_session_id: string }> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data: row, error } = await adminClient
      .from(this.sessionsTable)
      .select('id,user_id,auth_session_id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        throw new NotFoundException('Session not found.');
      }
      throw new ServiceUnavailableException('Failed to load the session.');
    }

    if (!row) {
      throw new NotFoundException('Session not found.');
    }

    return row as { id: string; user_id: string; auth_session_id: string };
  }

  private assertNotCurrentSession(
    row: { user_id: string; auth_session_id: string },
    actorId: string,
    currentAuthSessionId?: string,
  ) {
    // Only the actor's own current session is off-limits — an admin revoking
    // another member's sessions may never hit this, and a member revoking
    // their own other devices is the Security page's core promise.
    if (
      row.user_id === actorId &&
      currentAuthSessionId &&
      row.auth_session_id === currentAuthSessionId
    ) {
      throw new BadRequestException('You cannot revoke the current session.');
    }
  }

  /**
   * revokeLedgerRow — kills the GoTrue session server-side, drops the ledger
   * row, and writes the audit event. Shared by the self-service and org-admin
   * revocation paths; the action differs so the Activity feed can tell a
   * member's own device revocation (session_revoked) from an owner/admin
   * revoking a member's devices (member_session_revoked).
   */
  private async revokeLedgerRow(
    row: { id: string; user_id: string; auth_session_id: string },
    actor: CurrentUserPayload,
    details: Record<string, unknown> = {},
    action: string = 'session_revoked',
  ): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    await this.revokeAuthSessionViaAdmin(row.user_id, row.auth_session_id);

    const { error: deleteError } = await adminClient
      .from(this.sessionsTable)
      .delete()
      .eq('id', row.id);

    if (deleteError) {
      // The GoTrue session is already dead; a ledger-cleanup failure only
      // leaves a stale row that the next list can drop — report success.
      void deleteError;
    }

    await this.recordAudit({
      actor_email: actor.email ?? null,
      action,
      entity_type: 'auth_session',
      entity_id: row.id,
      details,
    });
  }

  // -------------------------------------------------------------------------
  // New-device sign-in detection
  // -------------------------------------------------------------------------

  /**
   * isNewDeviceCombo — true when the ledger has NO row for this
   * (user_id, device, ip_address) combo. Best-effort: any error (missing
   * table, unparseable response) degrades to false so detection can never
   * block sign-in. A combo with no device or ip info is treated as not-new
   * (nothing meaningful to compare).
   */
  private async isNewDeviceCombo(
    userId: string,
    device: string,
    ipAddress: string | null,
  ): Promise<boolean> {
    if (!userId || !device || !ipAddress) {
      return false;
    }

    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return false;
    }

    try {
      const { data, error } = await adminClient
        .from(this.sessionsTable)
        .select('id')
        .eq('user_id', userId)
        .eq('device', device)
        .eq('ip_address', ipAddress)
        .limit(1);

      if (error) {
        return false;
      }

      return (data ?? []).length === 0;
    } catch {
      return false;
    }
  }

  /**
   * handleNewDeviceSignIn — a first-time (device, ip) combo for the user:
   * always records a high-severity audit event (the trail is unconditional),
   * then honors the notifyOnNewDevice control by creating an in-app
   * notification and logging a mock email (no email provider is wired yet).
   * All writes are best-effort — detection must never break sign-in.
   */
  private async handleNewDeviceSignIn(
    userId: string,
    meta: { device: string; ipAddress: string | null; location: string | null },
  ): Promise<void> {
    await this.recordAudit({
      actor_email: null,
      action: 'new_device_signin',
      entity_type: 'auth_user',
      entity_id: userId,
      details: {
        device: meta.device,
        ip_address: meta.ipAddress,
        location: meta.location,
      },
    });

    const controls = await this.loadSecurityControls(userId);

    if (!controls.notifyOnNewDevice) {
      return;
    }

    // In-app notification (bell + notification center).
    await this.notificationsService.create(userId, {
      category: 'security',
      title: 'New device sign-in detected',
      description: `${meta.device} signed in from ${meta.ipAddress ?? 'an unknown IP'}${
        meta.location ? ` (${meta.location})` : ''
      }.`,
      link: '/app/security',
    });

    // Mock email — no provider is wired yet; the log line is the contract the
    // future transactional-email service will implement.
    this.logger.log(
      `[mock-email] To: user ${userId} — Subject: "New device sign-in detected" — ` +
        `${meta.device} from ${meta.ipAddress ?? 'unknown IP'}` +
        `${meta.location ? ` (${meta.location})` : ''} — secure your account if this wasn't you.`,
    );
  }

  /**
   * resolveUserTeam — best-effort team lookup for a user, used to tag the
   * self-service session ledger. profile-first (the denormalized 0012 column),
   * organization_members fallback (the 0005 relational source of truth) — the
   * same precedence the admin users list uses. Any error degrades to null so
   * a fresh DB without org/profile tables can never break the session list.
   */
  private async resolveUserTeam(userId: string): Promise<string | null> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return null;
    }

    try {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('team_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.team_id) {
        return profile.team_id as string;
      }

      const { data: membership } = await adminClient
        .from('organization_members')
        .select('team_id')
        .eq('user_id', userId)
        .maybeSingle();

      return (membership?.team_id as string | null) ?? null;
    } catch {
      return null;
    }
  }

  private async revokeAuthSessionViaAdmin(
    userId: string,
    authSessionId: string,
  ): Promise<void> {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new ServiceUnavailableException('Session revocation is not configured.');
    }

    const endpoint = `${url}/auth/v1/admin/users/${encodeURIComponent(
      userId,
    )}/sessions/${encodeURIComponent(authSessionId)}`;

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });
    } catch {
      throw new ServiceUnavailableException('Session revocation failed.');
    }

    // 404 means the GoTrue session is already gone — treat as revoked.
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException('Session revocation failed.');
    }
  }

  // -------------------------------------------------------------------------
  // Settings surface
  // -------------------------------------------------------------------------

  async getSettings(
    user: CurrentUserPayload,
    currentAuthSessionId?: string,
  ): Promise<{
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumber: boolean;
      requireSymbol: boolean;
    };
    activeSessions: SessionView[];
    signInControls: SecurityControls;
  }> {
    const [activeSessions, signInControls] = await Promise.all([
      this.listSessions(user, currentAuthSessionId),
      this.loadSecurityControls(user.id),
    ]);

    return {
      passwordPolicy: this.passwordPolicy(),
      activeSessions,
      signInControls,
    };
  }

  async updateSetting(
    user: CurrentUserPayload,
    key: string,
    value: unknown,
  ): Promise<{ ok: true; key: string; value: unknown }> {
    // Read-modify-write against the current controls (defaults on a fresh DB).
    // Validation runs before any config check so malformed input always 400s.
    const current = await this.loadSecurityControls(user.id);

    const next: SecurityControls = { ...current };

    if (key === 'twoFactorAuth') {
      const enabled =
        typeof value === 'object' && value !== null
          ? Boolean((value as { enabled?: unknown }).enabled)
          : Boolean(value);
      next.twoFactorAuth = { enabled, method: enabled ? 'app' : null, updatedAt: new Date().toISOString() };
    } else if (key === 'sessionTimeoutMinutes') {
      const minutes = Number(value);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new BadRequestException('Session timeout must be a positive number of minutes.');
      }
      next.sessionTimeoutMinutes = minutes;
    } else if (key === 'notifyOnNewDevice') {
      next.notifyOnNewDevice = Boolean(value);
    } else if (key === 'notifyOnPasswordChange') {
      next.notifyOnPasswordChange = Boolean(value);
    }

    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return { ok: true, key, value };
    }

    const { error } = await adminClient.from(this.settingsTable).upsert(
      {
        user_id: user.id,
        two_factor_enabled: next.twoFactorAuth.enabled,
        session_timeout_minutes: next.sessionTimeoutMinutes,
        notify_on_new_device: next.notifyOnNewDevice,
        notify_on_password_change: next.notifyOnPasswordChange,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error && !isMissingRelationError(error)) {
      throw new ServiceUnavailableException('Failed to save the security setting.');
    }

    await this.recordAudit({
      actor_email: user.email ?? null,
      action: 'security_setting_updated',
      entity_type: 'auth_user',
      entity_id: user.id,
      details: { key },
    });

    return { ok: true, key, value };
  }

  async changePassword(
    user: CurrentUserPayload,
    input: { currentPassword: string; newPassword: string },
    currentAuthSessionId?: string,
  ): Promise<{ ok: true }> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    if (!user.email) {
      throw new BadRequestException('An account email is required to change the password.');
    }

    // 1. Verify the current password. signInWithPassword minted a throwaway
    //    session — burn it immediately so it never appears as a new device.
    const publicClient = this.supabaseService.createPublicClient();

    if (!publicClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const verification = await publicClient.auth.signInWithPassword({
      email: user.email,
      password: input.currentPassword,
    });

    if (verification.error || !verification.data.session) {
      throw new BadRequestException('Current password is incorrect.');
    }

    const verificationRefreshToken = verification.data.session.refresh_token;
    const burnResult = await adminClient.auth.admin.signOut(verificationRefreshToken);
    void burnResult;

    // 2. Update the password via the admin API.
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: input.newPassword,
    });

    if (updateError) {
      throw new ServiceUnavailableException('Password could not be changed.');
    }

    // 3. Revoke every OTHER tracked session (the copy promises this) and
    //    clean their ledger rows. The current session stays signed in.
    const sessions = await this.listSessions(user, currentAuthSessionId);

    await Promise.allSettled(
      sessions
        .filter((session) => !session.isCurrent)
        .map((session) => this.revokeSession(user, session.id, currentAuthSessionId)),
    );

    await this.recordAudit({
      actor_email: user.email ?? null,
      action: 'password_changed',
      entity_type: 'auth_user',
      entity_id: user.id,
      details: {},
    });

    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private passwordPolicy() {
    return {
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH', 8),
      requireUppercase: this.configService.get<boolean>('PASSWORD_REQUIRE_UPPERCASE', true),
      requireNumber: this.configService.get<boolean>('PASSWORD_REQUIRE_NUMBER', true),
      requireSymbol: this.configService.get<boolean>('PASSWORD_REQUIRE_SYMBOL', true),
    };
  }

  private async loadSecurityControls(userId: string): Promise<SecurityControls> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return this.defaultControls();
    }

    const { data, error } = await adminClient
      .from(this.settingsTable)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return this.defaultControls();
    }

    return {
      twoFactorAuth: {
        enabled: Boolean(data.two_factor_enabled),
        method: data.two_factor_enabled ? 'app' : null,
        updatedAt: null,
      },
      emailVerification: { verified: true, verifiedAt: null },
      sessionTimeoutMinutes: Number(data.session_timeout_minutes) || 60,
      notifyOnNewDevice: Boolean(data.notify_on_new_device),
      notifyOnPasswordChange: Boolean(data.notify_on_password_change),
    };
  }

  private defaultControls(): SecurityControls {
    return {
      twoFactorAuth: { enabled: false, method: null, updatedAt: null },
      emailVerification: { verified: true, verifiedAt: null },
      sessionTimeoutMinutes: 60,
      notifyOnNewDevice: false,
      notifyOnPasswordChange: false,
    };
  }

  /**
   * recordAudit — best-effort write to the application audit trail
   * (auth_audit_events), matching AuthService's convention so security actions
   * appear in the account Activity feed and the admin audit trail in real mode.
   */
  private async recordAudit(entry: {
    actor_email: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    details: Record<string, unknown>;
  }): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    const { error } = await adminClient.from('auth_audit_events').insert({
      actor_email: entry.actor_email,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      details: entry.details,
    });

    void error;
  }
}
