-- =============================================================================
-- Oryntal CRM — Reconciliation migration
--
-- Purpose: bring a database that drifted from supabase/migrations/
-- 20250101000000_initial_schema.sql (created by hand or from an older copy)
-- back in line. Everything here is idempotent/safe to re-run.
--
-- Apply by pasting into the Supabase SQL Editor, or with: supabase db push
-- =============================================================================

begin;

-- 1) Profiles: make sure every column from the original schema exists.
--    (Their absence is why the handle_new_user trigger could not have been
--     running — it inserts `email`.)
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists avatar_url text;

-- 2) Auto-create a `profiles` row whenever a Supabase Auth user is created
--    (dashboard "Add user", the app's Add-user dialog, or GoTrue signups).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  );
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, v_name, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

-- Sanity check (should return ALL users you expect, normally one row each):
-- select u.email, p.id, p.full_name, p.role, p.is_active
-- from auth.users u
-- left join public.profiles p on p.id = u.id;