-- Organization workspace schema: organizations, teams, members, invites.
--
-- NOTE: this is a NEW migration (0005), not an edit to 0002_scans.sql — that
-- migration is scans-only and is already applied to the remote Supabase
-- project, so editing it would create drift. See
-- docs/engineering/ORGANIZATION_API_CONTRACT.md for the full contract.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan text not null default 'pro',
  seats integer not null default 1,
  storage_limit_gb numeric not null default 50,
  storage_used_gb numeric not null default 0,
  scan_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Teams (scoped to an organization)
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Members (profile user <-> organization join)
-- ---------------------------------------------------------------------------

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  team_id uuid references public.teams(id) on delete set null,
  token text not null unique default gen_random_uuid()::text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the hot org-scoped queries (FKs are not auto-indexed in PG)
-- ---------------------------------------------------------------------------

create index if not exists teams_organization_id_idx on public.teams (organization_id);
create index if not exists organization_invites_org_status_idx
  on public.organization_invites (organization_id, status);

-- ---------------------------------------------------------------------------
-- Row level security
--
-- The backend writes through the service-role admin client (RLS bypassed),
-- so these policies protect direct Supabase access: any member of an
-- organization can read its org, teams, members, and invites. Writes are
-- intentionally backend-only (no direct insert/update/delete policies).
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;

drop policy if exists "Organization is viewable by members" on public.organizations;
create policy "Organization is viewable by members"
on public.organizations
for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organizations.id and m.user_id = auth.uid()
  )
);

drop policy if exists "Teams are viewable by members" on public.teams;
create policy "Teams are viewable by members"
on public.teams
for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = teams.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members are viewable by org members" on public.organization_members;
create policy "Members are viewable by org members"
on public.organization_members
for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_members.organization_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "Invites are viewable by org members" on public.organization_invites;
create policy "Invites are viewable by org members"
on public.organization_invites
for select
to authenticated
using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_invites.organization_id
      and m.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row
execute function public.set_updated_at();
