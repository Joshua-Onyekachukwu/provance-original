-- Admin monitoring incidents. Seeded rows mirror the frontend mockMonitoring
-- incidents so the real path is immediately useful; the seed uses relative
-- timestamps computed at migration time.

create table if not exists public.admin_incidents (
  id text primary key,
  title text not null,
  severity text not null
    check (severity in ('critical', 'major', 'minor')),
  status text not null
    check (status in ('investigating', 'monitoring', 'resolved')),
  started_at timestamptz not null,
  resolved_at timestamptz,
  duration_hours numeric,
  services text[] not null default '{}',
  summary text not null default '',
  created_at timestamptz not null default now()
);

insert into public.admin_incidents
  (id, title, severity, status, started_at, resolved_at, duration_hours, services, summary)
values
  (
    'inc_001',
    'Scan worker partial outage',
    'major',
    'resolved',
    now() - interval '6 days 2 hours',
    now() - interval '5 days 9 hours',
    7,
    array['Scan Worker'],
    'A memory leak in the fingerprint model worker stalled processing for roughly a third of the queue. A rollback to the previous model release restored throughput.'
  ),
  (
    'inc_002',
    'Elevated API latency',
    'minor',
    'resolved',
    now() - interval '12 days 4 hours',
    now() - interval '12 days 11 hours',
    7,
    array['API Gateway'],
    'Autoscaling lag under a waitlist invite burst pushed p95 latency above target for seven hours. Autoscaling thresholds were retuned.'
  ),
  (
    'inc_003',
    'Storage upload errors',
    'major',
    'resolved',
    now() - interval '19 days 6 hours',
    now() - interval '19 days 9 hours',
    3,
    array['Object Storage (R2)'],
    'Signed upload URLs expired early under load, rejecting a subset of media uploads. The signing window was extended and the worker retries added.'
  ),
  (
    'inc_004',
    'Scan worker memory pressure',
    'major',
    'investigating',
    now() - interval '4 hours',
    null,
    null,
    array['Scan Worker'],
    'Resident memory on the worker pool is trending upward since the model update. Monitoring is active while a candidate fix is validated.'
  ),
  (
    'inc_005',
    'Database connection pool exhaustion',
    'critical',
    'resolved',
    now() - interval '25 days 3 hours',
    now() - interval '25 days 5 hours',
    2,
    array['Postgres (Neon)'],
    'A runaway query pattern exhausted the connection pool, causing intermittent timeouts. The query was optimized and pool limits raised.'
  )
on conflict (id) do nothing;

-- Incident severity + status lookups are the hot path on the monitoring page.
create index if not exists admin_incidents_status_idx on public.admin_incidents (status);
