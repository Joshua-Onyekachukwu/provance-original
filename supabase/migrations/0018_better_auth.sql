-- ===========================================================================
-- 0018_better_auth.sql — Better Auth schema (parallel auth provider)
--
-- Tables required by the Better Auth instance in
-- backend/src/auth/better-auth.config.ts, mounted at /api/auth.
--
--   core       → user, session, account, verification
--   twoFactor  → twoFactor (+ user.twoFactorEnabled)         [better-auth/plugins]
--   organization → organization, member, invitation, team,  [better-auth/plugins]
--                teamMember, role
--   apiKey     → apiKey                                      [@better-auth/api-key]
--
-- Field lists were extracted from the installed packages
-- (better-auth@1.6.26, @better-auth/api-key@1.6.26). Once DATABASE_URL is
-- set, reconcile with the canonical generator:
--
--   cd backend && npx @better-auth/cli generate --config src/auth/better-auth.config.ts
--
-- The generated SQL is the source of truth; this file is the reproducible
-- dashboard-SQL-editor equivalent (idempotent — safe to re-run).
--
-- NOTE: `user` is quoted because it is a reserved keyword in Postgres; the
-- better-auth pg adapter quotes identifiers the same way.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Core: user
-- ---------------------------------------------------------------------------
create table if not exists "user" (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  emailVerified boolean not null default false,
  image         text,
  createdAt     timestamptz not null,
  updatedAt     timestamptz not null,
  -- added by the twoFactor plugin
  twoFactorEnabled boolean
);

-- ---------------------------------------------------------------------------
-- Core: session
-- ---------------------------------------------------------------------------
create table if not exists "session" (
  id        text primary key,
  expiresAt timestamptz not null,
  token     text not null unique,
  createdAt timestamptz not null,
  updatedAt timestamptz not null,
  ipAddress text,
  userAgent text,
  userId    text not null references "user" (id) on delete cascade
);

create index if not exists session_user_id_idx on "session" (userId);

-- ---------------------------------------------------------------------------
-- Core: account
-- ---------------------------------------------------------------------------
create table if not exists "account" (
  id                    text primary key,
  accountId             text not null,
  providerId            text not null,
  userId                text not null references "user" (id) on delete cascade,
  accessToken           text,
  refreshToken          text,
  idToken               text,
  accessTokenExpiresAt  timestamptz,
  refreshTokenExpiresAt timestamptz,
  scope                 text,
  password              text,
  createdAt             timestamptz not null,
  updatedAt             timestamptz not null
);

create index if not exists account_user_id_idx on "account" (userId);

-- ---------------------------------------------------------------------------
-- Core: verification
-- ---------------------------------------------------------------------------
create table if not exists "verification" (
  id         text primary key,
  identifier text not null,
  value      text not null,
  expiresAt  timestamptz not null,
  createdAt  timestamptz,
  updatedAt  timestamptz
);

create index if not exists verification_identifier_idx on "verification" (identifier);

-- ---------------------------------------------------------------------------
-- twoFactor plugin
-- ---------------------------------------------------------------------------
create table if not exists "twoFactor" (
  id                      text primary key,
  userId                  text not null references "user" (id) on delete cascade,
  secret                  text not null,
  backupCodes             text,
  verified                boolean not null default false,
  failedVerificationCount integer not null default 0,
  lockedUntil             timestamptz
);

create unique index if not exists two_factor_user_id_idx on "twoFactor" (userId);

-- ---------------------------------------------------------------------------
-- organization plugin — organization
-- ---------------------------------------------------------------------------
create table if not exists "organization" (
  id        text primary key,
  name      text not null,
  slug      text not null unique,
  logo      text,
  metadata  jsonb,
  createdAt timestamptz not null
);

-- ---------------------------------------------------------------------------
-- organization plugin — team
-- ---------------------------------------------------------------------------
create table if not exists "team" (
  id             text primary key,
  name           text not null,
  organizationId text not null references "organization" (id) on delete cascade,
  createdAt      timestamptz not null,
  updatedAt      timestamptz
);

create index if not exists team_organization_id_idx on "team" (organizationId);

-- ---------------------------------------------------------------------------
-- organization plugin — member
-- ---------------------------------------------------------------------------
create table if not exists "member" (
  id             text primary key,
  organizationId text not null references "organization" (id) on delete cascade,
  userId         text not null references "user" (id) on delete cascade,
  role           text not null,
  createdAt      timestamptz not null default now()
);

create unique index if not exists member_org_user_idx on "member" (organizationId, userId);

-- ---------------------------------------------------------------------------
-- organization plugin — teamMember
-- ---------------------------------------------------------------------------
create table if not exists "teamMember" (
  id        text primary key,
  teamId    text not null references "team" (id) on delete cascade,
  userId    text not null references "user" (id) on delete cascade,
  createdAt timestamptz not null default now()
);

create unique index if not exists team_member_team_user_idx on "teamMember" (teamId, userId);

-- ---------------------------------------------------------------------------
-- organization plugin — invitation
-- ---------------------------------------------------------------------------
create table if not exists "invitation" (
  id             text primary key,
  organizationId text not null references "organization" (id) on delete cascade,
  email          text not null,
  role           text not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected', 'canceled')),
  teamId         text references "team" (id) on delete set null,
  inviterId      text not null,
  expiresAt      timestamptz not null,
  createdAt      timestamptz not null default now()
);

create index if not exists invitation_org_status_idx on "invitation" (organizationId, status);
create index if not exists invitation_email_idx on "invitation" (email);

-- ---------------------------------------------------------------------------
-- organization plugin — role (custom role → permission map)
-- ---------------------------------------------------------------------------
create table if not exists "role" (
  id             text primary key,
  organizationId text not null references "organization" (id) on delete cascade,
  role           text not null,
  permission     jsonb not null default '{}',
  createdAt      timestamptz not null default now(),
  updatedAt      timestamptz
);

create unique index if not exists role_org_role_idx on "role" (organizationId, role);

-- ---------------------------------------------------------------------------
-- apiKey plugin (@better-auth/api-key, references: 'user')
-- ---------------------------------------------------------------------------
create table if not exists "apiKey" (
  id                   text primary key,
  configId             text not null,
  name                 text,
  start                text,
  prefix               text,
  key                  text not null unique,
  -- polymorphic owner: the userId (references: 'user') or organizationId
  -- (references: 'organization'). No FK — the referenced entity varies.
  referenceId          text not null,
  refillInterval       integer,
  refillAmount         integer,
  lastRefillAt         timestamptz,
  enabled              boolean not null default true,
  rateLimitEnabled     boolean not null default false,
  rateLimitTimeWindow  integer,
  rateLimitMax         integer,
  requestCount         integer not null default 0,
  remaining            integer,
  lastRequest          timestamptz,
  expiresAt            timestamptz,
  createdAt            timestamptz not null,
  updatedAt            timestamptz not null,
  metadata             jsonb,
  permissions          jsonb
);

create index if not exists api_key_reference_id_idx on "apiKey" (referenceId);
