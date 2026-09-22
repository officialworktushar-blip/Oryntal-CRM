-- =============================================================================
-- Oryntal CRM — Admins can review super admins' work
--
-- Goals:
--   1) Let admins READ super admin profile rows so embedded relations like
--      assigned_to_profile / created_by_profile resolve for super admins.
--   2) Let admins see (and work) leads assigned to super admins, in addition
--      to the intern pipeline, unassigned leads, and their own leads.
--
-- Visibility that is NOT changed:
--   - interns still only see/update the leads assigned to them;
--   - super admins keep full visibility over everything.
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

-- 1) Admins may read super admin profiles (needed to resolve the
--    assigned_to_profile / created_by_profile embeds on super-admin leads).
drop policy if exists profiles_admin_select on public.profiles;
create policy "profiles_admin_select"
  on public.profiles for select
  using (public.is_admin());

-- 2) Admins may view & work leads assigned to a super admin, on top of the
--    intern pipeline, unassigned leads, and their own leads.
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
            and p.role in ('intern', 'super_admin')
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
            and p.role in ('intern', 'super_admin')
        )
      )
    )
  );

-- Refresh PostgREST's schema cache so the new policies take effect immediately.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;