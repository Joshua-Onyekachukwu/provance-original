import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const mockConfigService = {
    get: jest.fn(),
  } as unknown as ConfigService;

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
          access_token: 'access-token',
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
    const service = new AuthService(
      {
        createPublicClient,
        getAdminClient,
      } as any,
      mockConfigService,
    );

    const result = await service.signIn({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(createPublicClient).toHaveBeenCalledTimes(1);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.status).toBe('authenticated');
    expect(insertAuditEvent).toHaveBeenCalledTimes(1);
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
    const auditEventsTable = {
      insert: jest.fn().mockResolvedValue({ error: null }),
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
    const from = jest
      .fn()
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
    );

    await expect(
      service.acceptInvite({
        token: 'invite-token',
        password: 'password123',
        fullName: 'Invitee User',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

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
});
