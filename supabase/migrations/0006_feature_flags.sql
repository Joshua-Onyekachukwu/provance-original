-- Feature flags consumed by the admin Feature Flags page. The seed rows
-- mirror the frontend mockFeatureFlags so the real path is immediately useful.

create table if not exists public.feature_flags (
  key text primary key,
  label text not null,
  description text,
  enabled boolean not null default false,
  exposure text not null default 'all_users'
    check (exposure in ('all_users', 'org_admins', 'team_admins', 'internal', 'super_admin')),
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, label, description, enabled, exposure, owner) values
  ('deep_scan_mode', 'Deep Scan Mode', 'Enable full forensic analysis pipeline for uploads.', true, 'all_users', 'James Adedapo'),
  ('team_workspaces', 'Team Workspaces', 'Multi-user organization workspaces with shared scans and reports.', true, 'org_admins', 'Amina Sow'),
  ('api_access_v1', 'API Access v1', 'REST API for programmatic scan submission and report retrieval.', false, 'org_admins', 'James Adedapo'),
  ('report_export_pdf', 'PDF Report Export', 'Download verification reports as print-ready PDF documents.', true, 'all_users', 'Amina Sow'),
  ('watermark_detection', 'Watermark Detection', 'C2PA and embedded credential scanning pipeline.', true, 'all_users', 'James Adedapo'),
  ('email_notifications', 'Email Notifications', 'Transactional emails for scan completion, invites, and alerts.', true, 'all_users', 'Amina Sow'),
  ('bulk_upload', 'Bulk Upload', 'Upload and verify multiple media files in a single batch.', false, 'team_admins', 'James Adedapo'),
  ('ai_provider_fallback', 'AI Provider Fallback', 'Automatic failover to secondary AI provider when primary is degraded.', true, 'internal', 'James Adedapo'),
  ('usage_analytics', 'Usage Analytics Dashboard', 'Per-organization usage stats and scan volume reporting.', false, 'org_admins', 'Amina Sow'),
  ('sso_integration', 'SSO Integration (SAML/OIDC)', 'Enterprise single sign-on for organization members.', false, 'super_admin', 'James Adedapo')
on conflict (key) do nothing;
