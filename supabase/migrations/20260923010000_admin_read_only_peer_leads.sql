-- =============================================================================
-- Oryntal CRM — Admins see all work, but only edit what they manage
--
-- Goals:
--   1) Admins keep READ access to every lead (unassigned, interns, other
--      admins, super admins, and their own) so they can review each other's
--      and the super admins' work.
--   2) Admins can only MODIFY the leads they manage: unassigned leads, their
--      own leads, and the intern pipeline. Another admin's or a super admin's
--      personal leads become strictly read-only for them.
--   3) Super admins keep full CRUD over everything; interns are unchanged.
--
-- Idempotent — safe to re-run or paste into the Supabase SQL Editor.
-- =============================================================================

begin;

-- Defensive: ensure the role guards exist before the policies below use them.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and is_active
  );
$$;

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

-- Replace the single all-in-one admin policy with read / write-split policies.
--  - SELECT: admins (and super admins) see every lead.
--  - INSERT/UPDATE/DELETE: admins may only touch unassigned, their own, or
--    intern-assigned leads. Super admins keep full access everywhere.
drop policy if exists leads_admin_all on public.leads;

create policy "leads_admin_select"
  on public.leads for select
  using (public.is_admin());

create policy "leads_admin_insert"
  on public.leads for insert
  with check (
    public.is_super_admin()
    or (
      public.is_admin()
      and (
        assigned_to is null
        or assigned_to = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = leads.assigned_to
            and p.role = 'intern'
        )
      )
    )
  );

create policy "leads_admin_update"
  on public.leads for update
  using (
    public.is_super_admin()
    or (
      public.is_admin()
      and (
        assigned_to is null
        or assigned_to = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = leads.assigned_to
            and p.role = 'intern'
        )
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_admin()
      and (
        assigned_to is null
        or assigned_to = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = leads.assigned_to
            and p.role = 'intern'
        )
      )
    )
  );

create policy "leads_admin_delete"
  on public.leads for delete
  using (
    public.is_super_admin()
    or (
      public.is_admin()
      and (
        assigned_to is null
        or assigned_to = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = leads.assigned_to
            and p.role = 'intern'
        )
      )
    )
  );

-- Refresh PostgREST's schema cache so the new policies take effect immediately.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;