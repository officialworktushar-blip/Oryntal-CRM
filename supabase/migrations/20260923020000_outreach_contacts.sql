-- =============================================================================
-- Oryntal CRM — Outreach contacts
--
-- Tracks people the team reaches out to directly (outreaching), with their
-- contact details and when we last connected with them.
--
-- Access is limited to admins and super admins (matching the Outreacher
-- section visibility). Idempotent — safe to re-run in the SQL Editor.
-- =============================================================================

begin;

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

-- Keep updated_at fresh on every write.
drop trigger if exists trg_outreach_contacts_updated_at on public.outreach_contacts;
create trigger trg_outreach_contacts_updated_at
  before update on public.outreach_contacts
  for each row execute function public.set_updated_at();

alter table public.outreach_contacts enable row level security;

-- Admins and super admins get full CRUD over outreach contacts.
create policy "outreach_contacts_admin_all"
  on public.outreach_contacts for all
  using (public.is_admin())
  with check (public.is_admin());

-- Refresh PostgREST's schema cache so the new table takes effect immediately.
notify pgrst, 'reload schema';

commit;