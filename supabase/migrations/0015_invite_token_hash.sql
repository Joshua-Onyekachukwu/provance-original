-- 0015: org invite token hardening — store only a SHA-256 hash.
--
-- organization_invites.token previously held the raw invite token, so a
-- leaked invites table exposed usable acceptance tokens. The app now writes
-- token_hash (sha256 hex of the raw token) and matches acceptance by hash;
-- the raw token leaves the backend only in the inviteMember response, so it
-- travels via the share/email link and is never persisted.

alter table public.organization_invites
  add column if not exists token_hash text;

-- Backfill existing pending invites from their raw tokens so they stay
-- acceptable after this deploy (raw values are hashed in place and never
-- re-issued).
update public.organization_invites
set token_hash = encode(sha256(token::bytea), 'hex')
where token_hash is null and token is not null;

-- One accepted token per invite — partial so nulls never collide.
create unique index if not exists organization_invites_token_hash_idx
  on public.organization_invites (token_hash)
  where token_hash is not null;

-- Deprecate the raw column: neutralize the default + not-null so future rows
-- store no raw token bytes. The column itself is dropped in a follow-up
-- migration once this deploy is confirmed live.
alter table public.organization_invites
  alter column token drop default,
  alter column token drop not null;
