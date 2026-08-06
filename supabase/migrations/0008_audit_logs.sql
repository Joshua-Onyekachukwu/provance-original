-- Admin audit log. Written by backend services (service-role only) and read
-- by the admin Audit Logs endpoint (GET /admin/audit-logs). Seeded rows mirror
-- the frontend mockAuditEvents shape ({id, actor_email, action, severity,
-- resource_type, resource_id, created_at}) so the real path is immediately
-- useful; the seed uses relative timestamps computed at migration time.
--
-- RLS is enabled with no public policies: the Supabase service role bypasses
-- RLS, so only the backend can read/write the trail. The auth.audit_log_entries
-- table is left untouched — this is the application-level audit trail.

create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  actor_email text not null,
  action text not null,
  severity text not null default 'low'
    check (severity in ('critical', 'high', 'medium', 'low')),
  entity_type text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

insert into public.audit_logs
  (id, actor_email, action, severity, entity_type, entity_id, created_at)
values
  ('audit_0001', 'founder.admin@provance.local', 'user.invited',   'medium', 'user', 'usr_002', now() - interval '0 hours'),
  ('audit_0002', 'aisha.khan@provance.local',   'scan.submitted',  'medium', 'scan', 'scan_0042', now() - interval '2 hours'),
  ('audit_0003', 'aisha.khan@provance.local',   'scan.completed',  'low',    'scan', 'scan_0042', now() - interval '4 hours'),
  ('audit_0004', 'founder.admin@provance.local', 'role.changed',   'high',   'role', 'role_analyst', now() - interval '8 hours'),
  ('audit_0005', 'david.okafor@provance.local', 'report.exported', 'low',   'report', 'rpt_0042', now() - interval '10 hours'),
  ('audit_0006', 'system',                      'scan.failed',     'high',   'scan', 'scan_0041', now() - interval '1 day 2 hours'),
  ('audit_0007', 'founder.admin@provance.local', 'waitlist.approved', 'medium', 'waitlist_application', 'wl_0017', now() - interval '1 day 8 hours'),
  ('audit_0008', 'lucia.mendes@provance.local', 'team.member_added', 'medium', 'team', 'team_legal', now() - interval '2 days 1 hour'),
  ('audit_0009', 'founder.admin@provance.local', 'feature_flag.toggled', 'high', 'feature_flag', 'ff_deep_scan', now() - interval '2 days 6 hours'),
  ('audit_0010', 'david.okafor@provance.local', 'api_key.created', 'medium', 'api_key', 'key_0012', now() - interval '3 days 3 hours'),
  ('audit_0011', 'founder.admin@provance.local', 'settings.updated', 'low',  'settings', 'retention', now() - interval '3 days 9 hours'),
  ('audit_0012', 'aisha.khan@provance.local',   'report.viewed',   'low',    'report', 'rpt_0038', now() - interval '4 days 2 hours'),
  ('audit_0013', 'lucia.mendes@provance.local', 'scan.submitted',  'medium', 'scan', 'scan_0039', now() - interval '5 days 5 hours'),
  ('audit_0014', 'founder.admin@provance.local', 'org.created',    'medium', 'organization', 'org_0001', now() - interval '6 days 1 hour'),
  ('audit_0015', 'system',                      'waitlist.rejected', 'high', 'waitlist_application', 'wl_0009', now() - interval '6 days 8 hours')
on conflict (id) do nothing;

-- The endpoint orders by created_at desc and the page filters by action /
-- severity / actor, so those are the hot paths.
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_severity_idx on public.audit_logs (severity);
