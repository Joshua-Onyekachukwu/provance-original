import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from './notifications.service';

const USER_ID = 'user-1';

/**
 * Chainable supabase-js-style query builder for the notifications chains.
 *
 * list() runs two parallel chains off one builder (data + count, following
 * the account.service.spec.ts convention), each consuming one plan entry in
 * call order: [data result, count result]. markRead()/markAllRead() run a
 * single update chain that resolves through the thenable contract.
 */
function createAdminClient(plan: Array<Record<string, unknown>>) {
  let step = 0;
  const next = () => {
    const result = plan[step++];
    if (result === undefined) {
      throw new Error('Mock query plan exhausted — plan/sequence mismatch');
    }
    return result;
  };

  const builder = {
    from: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    range: jest.fn(() => builder),
    update: jest.fn(() => builder),
    maybeSingle: jest.fn(() => Promise.resolve(next())),
    then(resolve: (value: Record<string, unknown>) => void) {
      resolve(next());
      return undefined;
    },
  } as const;

  return builder as unknown as NonNullable<
    ReturnType<SupabaseService['getAdminClient']>
  >;
}

function createConfigService(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    SUPABASE_NOTIFICATIONS_TABLE: 'notifications',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: unknown) =>
      key in values ? values[key] : fallback,
    ),
  } as unknown as ConfigService;
}

function createService(client: unknown, config?: ConfigService) {
  return new NotificationsService(
    {
      getAdminClient: jest.fn(() => client),
    } as unknown as SupabaseService,
    config ?? createConfigService(),
  );
}

const user = { id: USER_ID };

const notificationRows = [
  {
    id: 'notif-3',
    user_id: USER_ID,
    category: 'scan',
    title: 'Scan completed successfully',
    description: 'Scan completed successfully — tap to view details.',
    is_read: false,
    link: '/app/reports/rpt_003',
    created_at: '2026-08-06T10:00:00.000Z',
  },
  {
    id: 'notif-2',
    user_id: USER_ID,
    category: 'team',
    title: 'New team member joined',
    description: 'New team member joined — tap to view details.',
    is_read: false,
    link: null,
    created_at: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'notif-1',
    user_id: USER_ID,
    category: 'billing',
    title: 'Invoice available for July 2026',
    description: 'Invoice available for July 2026 — tap to view details.',
    is_read: true,
    link: null,
    created_at: '2026-08-04T10:00:00.000Z',
  },
];

describe('NotificationsService', () => {
  describe('list', () => {
    it('scopes both queries to the signed-in user and returns the envelope', async () => {
      const client = createAdminClient([
        { data: notificationRows, error: null },
        { count: 3, error: null },
      ]);
      const service = createService(client);

      await service.list(user, {});

      // Both chains (data + count) eq on the user id.
      expect(client.from).toHaveBeenCalledTimes(2);
      expect(client.from).toHaveBeenCalledWith('notifications');
      expect(client.eq).toHaveBeenCalledTimes(2);
      expect(client.eq).toHaveBeenCalledWith('user_id', USER_ID);
      // Data chain: select(columns) → eq → order → range.
      expect(client.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(client.range).toHaveBeenCalledWith(0, 19);
      // Count chain uses the head-count select shape.
      expect(client.select).toHaveBeenCalledWith('id', {
        count: 'exact',
        head: true,
      });
    });

    it('maps rows to the mockNotifications shape (is_read → read)', async () => {
      const client = createAdminClient([
        { data: notificationRows, error: null },
        { count: 3, error: null },
      ]);
      const service = createService(client);

      const result = await service.list(user, { page: 1, pageSize: 20 });

      expect(result).toEqual({
        data: [
          {
            id: 'notif-3',
            category: 'scan',
            title: 'Scan completed successfully',
            description: 'Scan completed successfully — tap to view details.',
            read: false,
            link: '/app/reports/rpt_003',
            created_at: '2026-08-06T10:00:00.000Z',
          },
          {
            id: 'notif-2',
            category: 'team',
            title: 'New team member joined',
            description: 'New team member joined — tap to view details.',
            read: false,
            link: null,
            created_at: '2026-08-05T10:00:00.000Z',
          },
          {
            id: 'notif-1',
            category: 'billing',
            title: 'Invoice available for July 2026',
            description: 'Invoice available for July 2026 — tap to view details.',
            read: true,
            link: null,
            created_at: '2026-08-04T10:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('clamps page 0 → 1 and pageSize 300 → 200', async () => {
      const client = createAdminClient([
        { data: [], error: null },
        { count: 350, error: null },
      ]);
      const service = createService(client);

      const result = await service.list(user, { page: 0, pageSize: 300 });

      expect(client.range).toHaveBeenCalledWith(0, 199);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(200);
      // 350 / 200 → 2 pages.
      expect(result.totalPages).toBe(2);
    });

    it('falls back to row count when the count query returns null', async () => {
      const client = createAdminClient([
        { data: notificationRows, error: null },
        { count: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.list(user, {});

      expect(result.total).toBe(3);
    });

    it('locks the totalPages math when the count query returns null and the data spans multiple pages', async () => {
      // 45 rows at pageSize 20 → 3 pages. The count query resolves null (e.g.
      // a degraded PostgREST head-count), so total falls back to rows.length
      // and totalPages must still come out to ceil(45 / 20) = 3 — never 1.
      const multiPageRows = Array.from({ length: 45 }, (_, i) => ({
        id: `notif-${String(i + 1).padStart(3, '0')}`,
        user_id: USER_ID,
        category: 'scan',
        title: `Notification ${i + 1}`,
        description: null,
        is_read: i % 2 === 0,
        link: null,
        created_at: `2026-08-${String((i % 9) + 1).padStart(2, '0')}T10:00:00.000Z`,
      }));
      // Two list() calls below — each consumes a (data, count) pair.
      const client = createAdminClient([
        { data: multiPageRows, error: null },
        { count: null, error: null },
        { data: multiPageRows, error: null },
        { count: null, error: null },
      ]);
      const service = createService(client);

      const result = await service.list(user, { page: 1, pageSize: 20 });

      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);

      // Same math holds from any page offset — totalPages is page-independent.
      const page2 = await service.list(user, { page: 2, pageSize: 20 });
      expect(page2.totalPages).toBe(3);
      expect(page2.page).toBe(2);
    });

    it('throws 400 when the user has no id', async () => {
      const service = createService(createAdminClient([]));

      await expect(service.list({ id: '' }, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(service.list(user, {})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('throws 503 when either query fails', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'boom' } },
        { count: null, error: null },
      ]);
      const service = createService(client);

      await expect(service.list(user, {})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('honors a custom notifications table name from config', async () => {
      const config = createConfigService({
        SUPABASE_NOTIFICATIONS_TABLE: 'custom_notifications',
      });
      const client = createAdminClient([
        { data: [], error: null },
        { count: 0, error: null },
      ]);
      const service = createService(client, config);

      await service.list(user, {});

      expect(client.from).toHaveBeenCalledWith('custom_notifications');
    });
  });

  describe('markRead', () => {
    it('marks a notification read scoped to the user and returns the row', async () => {
      const client = createAdminClient([
        {
          data: { ...notificationRows[0], is_read: true },
          error: null,
        },
      ]);
      const service = createService(client);

      const result = await service.markRead(user, 'notif-3');

      expect(client.from).toHaveBeenCalledWith('notifications');
      expect(client.update).toHaveBeenCalledWith({ is_read: true });
      expect(client.eq).toHaveBeenCalledWith('id', 'notif-3');
      expect(client.eq).toHaveBeenCalledWith('user_id', USER_ID);
      expect(result).toEqual({
        ok: true,
        notification: expect.objectContaining({
          id: 'notif-3',
          read: true,
        }),
      });
    });

    it('404s when the notification is not owned by the user', async () => {
      const client = createAdminClient([{ data: null, error: null }]);
      const service = createService(client);

      await expect(service.markRead(user, 'notif-other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws 503 on update failure', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'boom' } },
      ]);
      const service = createService(client);

      await expect(service.markRead(user, 'notif-3')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('throws 400 when the user has no id', async () => {
      const service = createService(createAdminClient([]));

      await expect(service.markRead({ id: '' }, 'notif-3')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('markAllRead', () => {
    it('marks every notification for the user read and reports the count', async () => {
      const client = createAdminClient([
        {
          data: [notificationRows[0], notificationRows[1]],
          error: null,
        },
      ]);
      const service = createService(client);

      const result = await service.markAllRead(user);

      expect(client.update).toHaveBeenCalledWith({ is_read: true });
      expect(client.eq).toHaveBeenCalledWith('user_id', USER_ID);
      expect(client.select).toHaveBeenCalledWith('id');
      expect(result).toEqual({ ok: true, updated: 2 });
    });

    it('reports 0 updated when the user has no notifications', async () => {
      const client = createAdminClient([{ data: [], error: null }]);
      const service = createService(client);

      const result = await service.markAllRead(user);

      expect(result).toEqual({ ok: true, updated: 0 });
    });

    it('throws 503 on update failure', async () => {
      const client = createAdminClient([
        { data: null, error: { message: 'boom' } },
      ]);
      const service = createService(client);

      await expect(service.markAllRead(user)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('counts the user\'s unread rows via a head-count query scoped to is_read=false', async () => {
      const client = createAdminClient([{ count: 3, error: null }]);
      const service = createService(client);

      const result = await service.getUnreadCount(user);

      expect(client.from).toHaveBeenCalledWith('notifications');
      expect(client.select).toHaveBeenCalledWith('id', {
        count: 'exact',
        head: true,
      });
      expect(client.eq).toHaveBeenCalledWith('user_id', USER_ID);
      expect(client.eq).toHaveBeenCalledWith('is_read', false);
      expect(result).toEqual({ unread: 3 });
    });

    it('returns unread 0 when the head-count is null', async () => {
      const client = createAdminClient([{ count: null, error: null }]);
      const service = createService(client);

      const result = await service.getUnreadCount(user);

      expect(result).toEqual({ unread: 0 });
    });

    it('rejects 400 without a user id', async () => {
      const client = createAdminClient([{ count: 0, error: null }]);
      const service = createService(client);

      await expect(service.getUnreadCount({ id: '  ' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws 503 when Supabase is not configured', async () => {
      const service = createService(null);

      await expect(service.getUnreadCount(user)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('throws 503 on query failure', async () => {
      const client = createAdminClient([
        { count: null, error: { message: 'boom' } },
      ]);
      const service = createService(client);

      await expect(service.getUnreadCount(user)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
