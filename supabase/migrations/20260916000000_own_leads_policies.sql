-- =============================================================================
-- Oryntal CRM — Own-lead tracking & intern lead visibility
--
-- Goals:
--   1) Guarantee interns can ONLY see/update the leads assigned to THEM.
--      (Some databases drifted from the initial schema; this re-creates the
--       policies so an admin's or super admin's own leads are never visible
--       to interns.)
--   2) Admins & super admins keep full CRUD over every lead, including the
--      ones they assign to themselves and work personally.
--
-- Idempotent — safe to re-run or paste into the Supabase SQL Editor.
-- =============================================================================

begin;

-- Defensive: ensure the is_admin() guard exists before policies below use it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin')
      and is_active
  );
$$;

-- Re-establish lead RLS to match intent regardless of prior drift.
drop policy if exists leads_admin_all on public.leads;
drop policy if exists leads_intern_select on public.leads;
drop policy if exists leads_intern_update on public.leads;

-- admin + super_admin: full CRUD over every lead (including their own).
create policy "leads_admin_all"
  on public.leads for all
  using (public.is_admin())
  with check (public.is_admin());

-- interns: SELECT only the leads assigned to them — never anyone else's.
create policy "leads_intern_select"
  on public.leads for select
  using (assigned_to = auth.uid());

-- interns: UPDATE only the leads assigned to them.
create policy "leads_intern_update"
  on public.leads for update
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

commit;