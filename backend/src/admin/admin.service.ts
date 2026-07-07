import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

type WaitlistRow = {
  id: string;
  email: string;
  full_name: string;
  company: string | null;
  role_title: string | null;
  use_case: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
};

@Injectable()
export class AdminService {
  private readonly waitlistTable: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.waitlistTable =
      this.configService.get<string>('SUPABASE_WAITLIST_TABLE') || 'waitlist_applications';
  }

  async getDashboard() {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const [{ data: waitlistRows, error: waitlistError }, { data: inviteRows, error: inviteError }, { data: auditRows, error: auditError }] =
      await Promise.all([
        adminClient
          .from(this.waitlistTable)
          .select(
            'id,email,full_name,company,role_title,use_case,status,reviewed_by,reviewed_at,approved_at,created_at,updated_at,notes',
          )
          .order('created_at', { ascending: false }),
        adminClient
          .from('access_invites')
          .select('id,email,status,expires_at,accepted_at,created_at,waitlist_application_id')
          .order('created_at', { ascending: false }),
        adminClient
          .from('auth_audit_events')
          .select('id,actor_email,action,entity_type,entity_id,details,created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

    if (waitlistError || inviteError || auditError) {
      throw new ServiceUnavailableException('Failed to load admin dashboard.');
    }

    const waitlist = (waitlistRows ?? []) as WaitlistRow[];
    const invites = inviteRows ?? [];
    const recentAuditEvents = auditRows ?? [];

    const dailySignUps = buildDailySignUps(waitlist);

    return {
      summary: {
        totalRegistrations: waitlist.length,
        pendingReview: waitlist.filter((row) =>
          ['waitlist_submitted', 'under_review', 'deferred'].includes(row.status),
        ).length,
        approved: waitlist.filter((row) => row.status === 'approved').length,
        rejected: waitlist.filter((row) => row.status === 'rejected').length,
        invitesPending: invites.filter((invite) => invite.status === 'pending').length,
        invitesAccepted: invites.filter((invite) => invite.status === 'accepted').length,
      },
      dailySignUps,
      waitlist,
      invites,
      recentAuditEvents,
    };
  }

  async reviewWaitlistApplication(
    applicationId: string,
    reviewer: { id: string; email?: string },
    input: {
      status: 'under_review' | 'approved' | 'rejected' | 'deferred';
      notes?: string;
    },
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const record = await this.getWaitlistApplicationOrThrow(applicationId);
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: input.status,
      reviewed_by: reviewer.id,
      reviewed_at: now,
      notes: input.notes?.trim() || record.notes || null,
    };

    if (input.status === 'approved') {
      updates.approved_at = now;
    }

    const { error } = await adminClient
      .from(this.waitlistTable)
      .update(updates)
      .eq('id', applicationId);

    if (error) {
      throw new ServiceUnavailableException('Failed to update waitlist application.');
    }

    await this.insertAdminAuditEvent(reviewer, 'waitlist_reviewed', applicationId, {
      email: record.email,
      status: input.status,
      notes: input.notes?.trim() || null,
    });

    return {
      status: 'updated',
      applicationId,
      reviewStatus: input.status,
    };
  }

  async createInvite(
    applicationId: string,
    reviewer: { id: string; email?: string },
    input: { expiresInDays?: number },
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const application = await this.getWaitlistApplicationOrThrow(applicationId);
    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();
    const expiresInDays = input.expiresInDays ?? 7;
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await adminClient
      .from('access_invites')
      .insert({
        email: application.email,
        waitlist_application_id: application.id,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id,email,status,expires_at,accepted_at,created_at,waitlist_application_id')
      .single();

    if (error || !data) {
      throw new ServiceUnavailableException('Failed to create access invite.');
    }

    await adminClient
      .from(this.waitlistTable)
      .update({
        status: 'approved',
        reviewed_by: reviewer.id,
        reviewed_at: now.toISOString(),
        approved_at: now.toISOString(),
      })
      .eq('id', application.id);

    await this.insertAdminAuditEvent(reviewer, 'invite_created', data.id, {
      email: application.email,
      waitlist_application_id: application.id,
      expires_at: expiresAt,
    });

    return {
      status: 'created',
      invite: {
        ...data,
        inviteToken: rawToken,
      },
    };
  }

  private async getWaitlistApplicationOrThrow(applicationId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      throw new ServiceUnavailableException('Supabase is not configured.');
    }

    const { data, error } = await adminClient
      .from(this.waitlistTable)
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('Failed to fetch waitlist application.');
    }

    if (!data) {
      throw new NotFoundException('Waitlist application not found.');
    }

    return data as WaitlistRow;
  }

  private async insertAdminAuditEvent(
    reviewer: { id: string; email?: string },
    action: string,
    entityId: string,
    details: Record<string, unknown>,
  ) {
    const adminClient = this.supabaseService.getAdminClient();

    if (!adminClient) {
      return;
    }

    await adminClient.from('auth_audit_events').insert({
      actor_email: reviewer.email ?? null,
      action,
      entity_type: 'admin_operation',
      entity_id: entityId,
      details: {
        reviewer_id: reviewer.id,
        ...details,
      },
    });
  }
}

function buildDailySignUps(waitlist: WaitlistRow[]) {
  const bucket = new Map<string, number>();

  for (const row of waitlist) {
    const day = row.created_at.slice(0, 10);
    bucket.set(day, (bucket.get(day) || 0) + 1);
  }

  return Array.from(bucket.entries())
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([date, count]) => ({ date, count }));
}
