create extension if not exists pgcrypto;

create table if not exists public.waitlist_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  company text,
  role_title text,
  use_case text not null,
  status text not null default 'waitlist_submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  waitlist_application_id uuid references public.waitlist_applications(id) on delete set null,
  token_hash text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists waitlist_applications_set_updated_at on public.waitlist_applications;
create trigger waitlist_applications_set_updated_at
before update on public.waitlist_applications
for each row
execute function public.set_updated_at();
