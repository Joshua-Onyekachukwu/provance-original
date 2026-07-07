create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'scan_status') then
    create type public.scan_status as enum (
      'awaiting_upload',
      'queued',
      'processing',
      'complete',
      'failed'
    );
  end if;
end $$;

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status public.scan_status not null default 'awaiting_upload',
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  storage_bucket text not null,
  storage_path text not null,
  result_payload jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scans enable row level security;

drop policy if exists "Scans are viewable by owner" on public.scans;
create policy "Scans are viewable by owner"
on public.scans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Scans are insertable by owner" on public.scans;
create policy "Scans are insertable by owner"
on public.scans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Scans are updatable by owner" on public.scans;
create policy "Scans are updatable by owner"
on public.scans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provance-uploads',
  'provance-uploads',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();
