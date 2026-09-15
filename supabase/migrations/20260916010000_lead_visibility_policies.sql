-- =============================================================================
-- Oryntal CRM — Role-scoped lead visibility
--
-- Goals:
--   1) super_admin: full visibility over every lead in the company
--      (admins' leads, interns' leads, unassigned, and their own).
--   2) admin: can manage the intern pipeline and their own work —
--      unassigned leads, leads assigned to interns (by any admin or super
--      admin), and leads assigned to themselves. They can NO LONGER see or
--      touch another admin's or a super admin's personal leads.
--   3) intern: unchanged — only the leads assigned to them.
--
-- Idempotent — safe to re-run or paste into the Supabase SQL Editor.
-- =============================================================================

begin;

-- Defensive: ensure the role guards exist before the policy below uses them.
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

-- Replace the previous all-seeing admin policy with the role-scoped version.
drop policy if exists leads_admin_all on public.leads;

create policy "leads_admin_all"
  on public.leads for all
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

commit;