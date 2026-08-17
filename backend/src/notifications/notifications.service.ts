import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseService } from '../supabase/supabase.service';

type NotificationRow = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
};

@Injectable()
export class NotificationsService {
  private readonly notificationsTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.notificationsTable =
      this.configService.get<string>('SUPABASE_NOTIFICATIONS_TABLE') ||
      'notifications';
  }

  /**
   * list — the signed-in user's notification feed, scoped by user_id.
   *
   * Returns the pagination envelope the frontend bell + notification center
   * consume (data/page/pageSize/total/totalPages), with each row mapped to
   * the mockNotifications shape ({ id, category, title, description, read,
   * link, created_at }).
   */
  async list(
    user: CurrentUserPayload,
    input: { page?: number; pageSize?: number } = {},
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const userId = user.id?.trim();
    if (!userId) {
      throw new BadRequestException(
        'An authenticated user is required to load notifications.',
      );
    }

    const safePage = Math.max(1, input.page ?? 1);
    const safePageSize = Math.min(200, Math.max(1, input.pageSize ?? 20));
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;

    // ── Scoped queries (data + count share the same user_id filter) ────────
    const dataQuery = adminClient
      .from(this.notificationsTable)
      .select('id,user_id,category,title,description,is_read,link,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    const countQuery = adminClient
      .from(this.notificationsTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error || countError) {
      throw new ServiceUnavailableException('Failed to load notifications.');
    }

    const rows = (data ?? []) as NotificationRow[];
    const total = count ?? rows.length;

    return {
      data: rows.map((row) => this.serialize(row)),
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    };
  }

  /**
   * create — inserts a notification row for a user (used by the security
   * service for new-device sign-in alerts and by any future system events).
   * Best-effort like the other notification writes: a missing table degrades
   * to a no-op instead of breaking the caller's flow.
   */
  async create(
    userId: string,
    input: {
      category: string;
      title: string;
      description?: string;
      link?: string | null;
    },
  ): Promise<void> {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient || !userId?.trim()) {
      return;
    }

    const { error } = await adminClient.from(this.notificationsTable).insert({
      user_id: userId,
      category: input.category,
      title: input.title,
      description: input.description ?? null,
      is_read: false,
      link: input.link ?? null,
    });

    // Best-effort: a missing notifications table (migration 0011 not applied)
    // must never fail a security write the caller depends on.
    void error;
  }

  /**
   * getUnreadCount — a single number for the shell's badge, so the app can
   * poll the badge without refetching the whole feed. Uses a head-count query
   * (no rows transferred) scoped to the user with is_read = false.
   */
  async getUnreadCount(user: CurrentUserPayload) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const userId = user.id?.trim();
    if (!userId) {
      throw new BadRequestException(
        'An authenticated user is required to load notifications.',
      );
    }

    const { count, error } = await adminClient
      .from(this.notificationsTable)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new ServiceUnavailableException(
        'Failed to load unread notifications.',
      );
    }

    return { unread: count ?? 0 };
  }

  /**
   * markRead — marks a single notification read, scoped to the user so a
   * user can never flip another user's notification. Returns the updated
   * serialized row, or 404 if the id is not theirs (or doesn't exist).
   */
  async markRead(user: CurrentUserPayload, notificationId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const userId = user.id?.trim();
    if (!userId) {
      throw new BadRequestException(
        'An authenticated user is required to update notifications.',
      );
    }

    const { data, error } = await adminClient
      .from(this.notificationsTable)
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('id,user_id,category,title,description,is_read,link,created_at')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to update notification.');
    }
    if (!data) {
      throw new NotFoundException('Notification not found.');
    }

    return { ok: true, notification: this.serialize(data as NotificationRow) };
  }

  /**
   * markAllRead — marks every notification for the signed-in user as read.
   * Returns the affected row count (0 when the user has none).
   */
  async markAllRead(user: CurrentUserPayload) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const userId = user.id?.trim();
    if (!userId) {
      throw new BadRequestException(
        'An authenticated user is required to update notifications.',
      );
    }

    const { data, error } = await adminClient
      .from(this.notificationsTable)
      .update({ is_read: true })
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new ServiceUnavailableException(
        'Failed to update notifications.',
      );
    }

    return { ok: true, updated: (data ?? []).length };
  }

  private serialize(row: NotificationRow) {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description || '',
      read: row.is_read,
      link: row.link,
      created_at: row.created_at,
    };
  }
}
