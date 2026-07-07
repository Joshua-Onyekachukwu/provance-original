alter table public.waitlist_applications
  add column if not exists notes text;

alter table public.access_invites
  add column if not exists invited_by uuid;
