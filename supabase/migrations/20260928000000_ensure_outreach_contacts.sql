-- =============================================================================
-- Oryntal CRM — ensure public.outreach_contacts exists
--
-- 20260923020000_outreach_contacts.sql was committed but never applied to the
-- database, so every read/write of `outreach_contacts` failed with
--   PGRST205: Could not find the table 'public.outreach_contacts'
--             in the schema cache
-- and the Outreacher tab rendered an empty list.
--
-- This migration is the idempotent, re-runnable version of it: the policy is
-- dropped before it is created (the original would fail on a second run) and
-- PostgREST's schema cache is reloaded at the end.
-- =============================================================================

begin;

-- Declared here so this migration does not depend on the initial schema having
-- been applied to this database (it is a trigger function, so PostgREST never
-- lists it and its absence is otherwise invisible until the trigger fails).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  company text,
  platform text,
  notes text,
  last_connected_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Older installs may have the table without the later columns.
alter table public.outreach_contacts add column if not exists platform text;
alter table public.outreach_contacts add column if not exists notes text;
alter table public.outreach_contacts add column if not exists last_connected_at timestamptz;
alter table public.outreach_contacts add column if not exists company text;

create index if not exists outreach_contacts_created_by_idx
  on public.outreach_contacts (created_by);

-- Keep updated_at fresh on every write.
drop trigger if exists trg_outreach_contacts_updated_at on public.outreach_contacts;
create trigger trg_outreach_contacts_updated_at
  before update on public.outreach_contacts
  for each row execute function public.set_updated_at();

alter table public.outreach_contacts enable row level security;

-- Admins and super admins get full CRUD over outreach contacts.
drop policy if exists "outreach_contacts_admin_all" on public.outreach_contacts;
create policy "outreach_contacts_admin_all"
  on public.outreach_contacts for all
  using (public.is_admin())
  with check (public.is_admin());

-- Refresh PostgREST's schema cache so the new table takes effect immediately.
notify pgrst, 'reload schema';

commit;
