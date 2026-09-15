-- =============================================================================
-- Oryntal CRM — Ensure public.update_lead_status RPC + refresh PostgREST cache
--
-- Symptom (intern panel, changing a lead's current status):
--   "Couldn't find the function public.update_lead_status(p_lead_id,p_note,
--    p_status) in the schema cache"
--
-- This error is PostgREST's own. It means that at call time PostgREST did not
-- have the update_lead_status(p_lead_id, p_status, p_note) signature registered
-- in its in-memory schema cache — either the function was never created in the
-- live database (schema drift), or it was added without PostgREST reloading its
-- cache (the "Refresh Schema" button / NOTIFY below).
--
-- Everything here is idempotent and safe to re-run or paste into the Supabase
-- SQL editor. `CREATE OR REPLACE` guarantees the exact parameter names/types the
-- app calls, and the NOTIFY lines force PostgREST to immediately refresh.
-- =============================================================================

begin;

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

-- Refresh PostgREST's schema cache so the RPC is immediately callable.
-- (Fires on commit, i.e. after the DDL above is visible.)
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;