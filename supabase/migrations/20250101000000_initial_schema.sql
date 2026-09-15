-- =============================================================================
-- Oryntal CRM — Initial schema, Row Level Security, triggers & RPC helpers
--
-- Apply with:
--   supabase db push
-- or paste into the Supabase SQL editor.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('super_admin', 'admin', 'intern');
create type public.lead_status as enum (
  'new', 'contacted', 'follow_up', 'interested', 'not_interested',
  'converted', 'lost'
);
create type public.activity_type as enum (
  'call', 'email', 'whatsapp', 'meeting', 'note', 'status_change'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.user_role not null default 'intern',
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  company text,
  source text,
  status public.lead_status not null default 'new',
  priority text not null default 'medium',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  notes text,
  next_follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  type public.activity_type not null default 'note',
  description text,
  outcome text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_is_active_idx on public.profiles (is_active);
create index leads_status_idx on public.leads (status);
create index leads_assigned_to_idx on public.leads (assigned_to);
create index leads_created_by_idx on public.leads (created_by);
create index leads_next_follow_up_idx on public.leads (next_follow_up_date);
create index lead_activities_lead_idx on public.lead_activities (lead_id);
create index lead_activities_user_idx on public.lead_activities (user_id);
create index notifications_user_idx on public.notifications (user_id, is_read);

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create a profile when a new Supabase Auth user signs up.
-- Defaults to 'intern'; super_admin upgrades roles from the admin UI.
-- -----------------------------------------------------------------------------
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Role helper functions (security definer — avoids RLS self-referencing).
-- Used by policies below.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Notifications (auto-generated via triggers)
-- -----------------------------------------------------------------------------
create or replace function public.notify_on_lead_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    insert into public.notifications (user_id, message)
    values (
      new.assigned_to,
      'A new lead "' || coalesce(new.name, '') || '" has been assigned to you.'
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_notify_lead_assigned
  after insert or update of assigned_to on public.leads
  for each row execute function public.notify_on_lead_assigned();

create or replace function public.notify_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in ('converted', 'lost')
     and new.created_by is not null then
    insert into public.notifications (user_id, message)
    values (
      new.created_by,
      'Lead "' || coalesce(new.name, '') || '" was marked as ' || new.status || '.'
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_notify_status_change
  after update of status on public.leads
  for each row execute function public.notify_on_status_change();

-- -----------------------------------------------------------------------------
-- RPC helpers (atomic operations, security invoker → RLS still applies)
-- -----------------------------------------------------------------------------
create or replace function public.update_lead_status(
  p_lead_id uuid,
  p_status public.lead_status,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old public.lead_status;
begin
  select status into v_old from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;

  update public.leads set status = p_status where id = p_lead_id;

  if v_old is distinct from p_status then
    insert into public.lead_activities (lead_id, user_id, type, description, outcome)
    values (
      p_lead_id,
      auth.uid(),
      'status_change',
      'Status changed from ' || v_old::text || ' to ' || p_status::text,
      p_note
    );
  end if;
end;
$$;

create or replace function public.log_lead_activity(
  p_lead_id uuid,
  p_type public.activity_type,
  p_description text default null,
  p_outcome text default null,
  p_follow_up date default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from public.leads where id = p_lead_id) then
    raise exception 'lead not found' using errcode = 'P0002';
  end if;

  if p_follow_up is not null then
    update public.leads set next_follow_up_date = p_follow_up where id = p_lead_id;
  end if;

  insert into public.lead_activities (lead_id, user_id, type, description, outcome)
  values (p_lead_id, auth.uid(), p_type, p_description, p_outcome);
end;
$$;

-- -----------------------------------------------------------------------------
-- Guards
-- -----------------------------------------------------------------------------
create or replace function public.prevent_super_admin_deletion()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'super_admin' then
    raise exception 'super_admin accounts cannot be deleted';
  end if;
  return old;
end;
$$;

create trigger trg_prevent_super_admin_delete
  before delete on public.profiles
  for each row execute function public.prevent_super_admin_deletion();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.notifications enable row level security;

-- PROFILES ---------------------------------------------------------------------
-- Everyone can read their own row.
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read intern rows (and their own via the self policy).
create policy "profiles_admin_select"
  on public.profiles for select
  using (public.is_admin() and role <> 'super_admin');

-- super_admin: full access to every profile.
create policy "profiles_super_admin_all"
  on public.profiles for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- admin: may create intern profiles only.
create policy "profiles_admin_insert"
  on public.profiles for insert
  with check (public.is_admin() and role = 'intern');

-- admin: may update interns and themselves — never other admins or super admins.
create policy "profiles_admin_update"
  on public.profiles for update
  using (
    public.is_admin()
    and role <> 'super_admin'
    and (role <> 'admin' or id = auth.uid())
  )
  with check (
    role <> 'super_admin'
    and (role = 'intern' or (role = 'admin' and id = auth.uid()))
  );

-- LEADS ------------------------------------------------------------------------
-- admin + super_admin: full CRUD.
create policy "leads_admin_all"
  on public.leads for all
  using (public.is_admin())
  with check (public.is_admin());

-- interns: only the leads assigned to them (cannot insert, cannot delete,
-- cannot reassign).
create policy "leads_intern_select"
  on public.leads for select
  using (assigned_to = auth.uid());

create policy "leads_intern_update"
  on public.leads for update
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- LEAD_ACTIVITIES ---------------------------------------------------------------
-- admin + super_admin: full CRUD.
create policy "activities_admin_all"
  on public.lead_activities for all
  using (public.is_admin())
  with check (public.is_admin());

-- interns: read activities of their own leads.
create policy "activities_intern_select"
  on public.lead_activities for select
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_activities.lead_id
        and l.assigned_to = auth.uid()
    )
  );

-- interns: log activities on their own leads only.
create policy "activities_intern_insert"
  on public.lead_activities for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.leads l
      where l.id = lead_activities.lead_id
        and l.assigned_to = auth.uid()
    )
  );

-- NOTIFICATIONS ----------------------------------------------------------------
-- Users can view and mark their own notifications as read.
create policy "notifications_self_select"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_self_update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_admin_insert"
  on public.notifications for insert
  with check (public.is_admin());

commit;