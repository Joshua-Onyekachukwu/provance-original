-- 0012: team assignment on the user directory (profiles).
--
-- The admin Users page renders each user's team badge and drives its team
-- filter from the user row's team_id (mirroring mockUsers.team_id). The
-- organization_members table is the relational source of truth for team
-- assignment, but the user-directory query path reads a flat profile row —
-- so profiles gains a denormalized team_id, backfilled from the first
-- active membership per user. New assignments are written by the org
-- service (updateMemberTeam) which keeps both columns in sync.

alter table public.profiles
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists profiles_team_id_idx on public.profiles (team_id);

-- Backfill: first active membership's team per user (created_at asc).
update public.profiles p
set team_id = m.team_id
from (
  select distinct on (user_id) user_id, team_id
  from public.organization_members
  where team_id is not null and status = 'active'
  order by user_id, created_at asc
) m
where m.user_id = p.user_id
  and p.team_id is null;
