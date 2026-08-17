-- 0017: seed demo rows for the user_sessions ledger.
--
-- The security service writes ledger rows on every real sign-in, so the
-- table self-populates in normal use. This seed exists so a freshly-migrated
-- environment (or one where nobody has signed in yet) still renders the
-- Security page's "active sessions" surface with plausible data — the same
-- relative-timestamp pattern as the incidents (0007) and audit-log (0008)
-- seeds.
--
-- It targets the dev test account (founder.admin@provance.local, the owner
-- the seed-org script creates) and is a strict no-op otherwise: the DO block
-- bails when that auth user does not exist, so a production DB with no such
-- account is untouched, and it skips when the user already has ledger rows so
-- it never fights real sessions.
--
-- auth_session_id values are UUID-format demo ids, distinct from any real
-- GoTrue session id (real ones never collide with the '00000000-0000-…'
-- prefix). The refresh_token_hash columns are SHA-256 hashes of dummy refresh
-- values — never raw tokens, matching the ledger's at-rest doctrine. Note:
-- revoking a *demo* row via the Security page will fail the GoTrue admin call
-- (the fake session id does not exist there), so the UI surfaces an error
-- toast; the ledger row itself is only removed by the real sign-in/sign-out
-- lifecycle.

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'founder.admin@provance.local'
  limit 1;

  if v_user_id is not null and not exists (
    select 1 from public.user_sessions where user_id = v_user_id
  ) then
    insert into public.user_sessions
      (user_id, auth_session_id, refresh_token_hash, device, ip_address, location, created_at, last_active_at)
    values
      (
        v_user_id,
        '00000000-0000-4000-8000-00000000d001',
        encode(sha256('demo-refresh-current'::bytea), 'hex'),
        'Chrome 126 · macOS',
        '41.90.98.12',
        'Lagos, NG',
        now() - interval '2 hours',
        now() - interval '2 hours'
      ),
      (
        v_user_id,
        '00000000-0000-4000-8000-00000000d002',
        encode(sha256('demo-refresh-laptop'::bytea), 'hex'),
        'Firefox 128 · Windows',
        '102.89.33.7',
        'Abuja, NG',
        now() - interval '3 days',
        now() - interval '1 day'
      ),
      (
        v_user_id,
        '00000000-0000-4000-8000-00000000d003',
        encode(sha256('demo-refresh-mobile'::bytea), 'hex'),
        'Safari 17 · iOS',
        '154.120.70.4',
        'Nairobi, KE',
        now() - interval '6 days',
        now() - interval '5 days'
      );
  end if;
end $$;
