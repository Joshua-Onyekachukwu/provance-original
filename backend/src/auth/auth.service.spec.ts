import { createHash } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

/** Builds a 3-part JWT whose payload carries the given sid claim. */
function jwtWithSid(sid: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'ES256', typ: 'JWT' })}.${encode({ sub: 'user-1', sid })}.signature`;
}

describe('AuthService', () => {
  const mockConfigService = {
    // Emulate ConfigService.get(key, fallback): missing keys resolve to the
    // fallback, so the constructor's schema-matching table defaults apply.
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  } as unknown as ConfigService;
  const mockAccountService = {
    getCurrentViewer: jest.fn(),
  };
  const mockSecurityService = {
    recordSession: jest.fn().mockResolvedValue(undefined),
    deleteSessionByRefreshHash: jest.fn().mockResolvedValue(undefined),
    deleteUserSessions: jest.fn().mockResolvedValue(undefined),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a fresh public auth client per sign-in request', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'user@example.com',
        },
        session: {
          access_token: jwtWithSid('sid-1'),
          refresh_token: 'refresh-token',
          expires_at: 123,
          token_type: 'bearer',
        },
      },
      error: null,
    });
    const insertAuditEvent = jest.fn().mockResolvedValue({ error: null });
    const createPublicClient = jest.fn().mockReturnValue({
      auth: {
        signInWithPassword,
      },
    });
    const getAdminClient = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: insertAuditEvent,
      }),
    });
    mockAccountService.getCurrentViewer.mockResolvedValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
      permissions: {
        individual: true,
        team: false,
        admin: false,
      },
      profile: {
        displayName: 'User',
        organization: '',
        roleTitle: '',
        defaultWorkspace: 'individual',
        emailNotifications: true,
      },
    });
    const service = new AuthService(
      mockAccountService as any,
      {
        createPublicClient,
        getAdminClient,
      } as any,
      mockConfigService,
      mockSecurityService as any,
    );

    const result = await service.signIn(
      {
        email: 'user@example.com',
        password: 'password123',
      },
      { device: 'Chrome on Windows' },
    );

    expect(createPublicClient).toHaveBeenCalledTimes(1);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.status).toBe('authenticated');
    expect(insertAuditEvent).toHaveBeenCalledTimes(1);
    // Successful sign-in records the session ledger entry (sid from the JWT)
    // with the device meta.
    expect(mockSecurityService.recordSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        authSessionId: 'sid-1',
        refreshToken: 'refresh-token',
        meta: { device: 'Chrome on Windows' },
      }),
    );
  });

  it('logs failed sign-ins and rejects invalid credentials', async () => {
    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: {
        message: 'Invalid login credentials',
      },
    });
    const insertAuditEvent = jest.fn().mockResolvedValue({ error: null });
    const service = new AuthService(
      mockAccountService as any,
      {
        createPublicClient: jest.fn().mockReturnValue({
          auth: {
            signInWithPassword,
          },
        }),
        getAdminClient: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            insert: insertAuditEvent,
          }),
        }),
      } as any,
      mockConfigService,
      mockSecurityService as any,
    );

    await expect(
      service.signIn({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(insertAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_email: 'user@example.com',
        action: 'sign_in_failed',
      }),
    );
  });

  it('rolls back invite activation if invite state persistence fails', async () => {
    const accessInviteLookup = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'invite-1',
          email: 'invitee@example.com',
          waitlist_application_id: 'waitlist-1',
          status: 'pending',
          expires_at: '2099-01-01T00:00:00.000Z',
        },
        error: null,
      }),
    };
    const inviteUpdate = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'write failed' } }),
    };
    const inviteRollback = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    const waitlistRollback = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    const deleteUser = jest.fn().mockResolvedValue({ error: null });
    const createUser = jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'invitee@example.com',
        },
      },
      error: null,
    });
    // acceptInvite checks the org-invite token path first; when no
    // organization_invites row matches, it falls back to the access_invites
    // hashed-token flow below.
    const orgInviteLookup = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const from = jest
      .fn()
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('organization_invites');
        return orgInviteLookup;
      })
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('access_invites');
        return accessInviteLookup;
      })
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('access_invites');
        return inviteUpdate;
      })
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('access_invites');
        return inviteRollback;
      })
      .mockImplementationOnce((table: string) => {
        expect(table).toBe('waitlist_applications');
        return waitlistRollback;
      });

    const service = new AuthService(
      mockAccountService as any,
      {
        createPublicClient: jest.fn(),
        getAdminClient: jest.fn().mockReturnValue({
          from,
          auth: {
            admin: {
              createUser,
              deleteUser,
            },
          },
        }),
      } as any,
      mockConfigService,
      mockSecurityService as any,
    );

    await expect(
      service.acceptInvite({
        token: 'invite-token',
        password: 'password123',
        fullName: 'Invitee User',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    // Org-invite lookup is by SHA-256 hash, never the raw token (migration
    // 0015): the first eq is the token_hash match against the hashed token.
    expect(orgInviteLookup.eq).toHaveBeenNthCalledWith(
      1,
      'token_hash',
      createHash('sha256').update('invite-token').digest('hex'),
    );
    expect(orgInviteLookup.eq).toHaveBeenNthCalledWith(2, 'status', 'pending');

    expect(createUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith('user-1');
    expect(inviteUpdate.update).toHaveBeenCalledWith({
      status: 'accepted',
      accepted_at: expect.any(String),
    });
    expect(inviteRollback.update).toHaveBeenCalledWith({
      status: 'pending',
      accepted_at: null,
    });
    expect(waitlistRollback.update).toHaveBeenCalledWith({
      status: 'waitlist_submitted',
      approved_at: null,
    });
  });

  it('records a replayed rotated refresh token as a high-severity audit event', async () => {
    const insertAuditEvent = jest.fn().mockResolvedValue({ error: null });
    const createPublicClient = jest.fn().mockReturnValue({
      auth: {
        refreshSession: jest.fn().mockResolvedValue({
          data: { session: null, user: null },
          // The replay signature: GoTrue rejects a rotated token with this
          // exact message, which is what a token-theft replay produces.
          error: { message: 'Refresh Token Not Found', status: 400 },
        }),
      },
    });
    const getAdminClient = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: insertAuditEvent,
      }),
    });
    const service = new AuthService(
      mockAccountService as any,
      { createPublicClient, getAdminClient } as any,
      mockConfigService,
      mockSecurityService as any,
    );

    await expect(
      service.refreshSession(
        { refreshToken: 'replayed-token' },
        { device: 'Test Device', ipAddress: '10.0.0.1', location: 'Test City' },
        'cookie',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(getAdminClient).toHaveBeenCalledTimes(1);
    expect(insertAuditEvent).toHaveBeenCalledTimes(1);
    const row = insertAuditEvent.mock.calls[0][0];
    expect(row.action).toBe('refresh_token_rejected');
    expect(row.severity).toBe('high');
    expect(row.actor_email).toBe('system');
    expect(row.entity_type).toBe('auth_session');
    // Only the SHA-256 hash of the presented token is stored — never the raw
    // value, so a leaked audit_logs table never leaks the credential.
    expect(row.details.refresh_token_hash).toBe(
      createHash('sha256').update('replayed-token').digest('hex'),
    );
    expect(row.details.refresh_token_hash).not.toContain('replayed-token');
    expect(row.details.reuse_suspected).toBe(true);
    expect(row.details.token_source).toBe('cookie');
    expect(row.details.device).toBe('Test Device');
    expect(row.details.ip_address).toBe('10.0.0.1');
  });

  it('never lets a failing audit insert block the refresh rejection (best-effort)', async () => {
    const createPublicClient = jest.fn().mockReturnValue({
      auth: {
        refreshSession: jest.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: 'Refresh Token Not Found', status: 400 },
        }),
      },
    });
    const getAdminClient = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: jest
          .fn()
          .mockResolvedValue({ error: { message: 'audit_logs does not exist' } }),
      }),
    });
    const service = new AuthService(
      mockAccountService as any,
      { createPublicClient, getAdminClient } as any,
      mockConfigService,
      mockSecurityService as any,
    );

    // The rejection must still surface even though the audit write failed
    // (e.g. migration 0008 not applied) — the audit trail is advisory.
    await expect(
      service.refreshSession({ refreshToken: 'replayed-token' }, undefined, 'body'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
