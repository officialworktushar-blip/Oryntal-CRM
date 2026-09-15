-- =============================================================================
-- Oryntal CRM — Ensure lead RPC helpers exist + refresh PostgREST cache
--
-- Symptoms (intern/admin/super-admin panels):
--   - "Couldn't find the function public.update_lead_status(...) in the
--     schema cache"    (changing a lead's current status)
--   - "Couldn't find the function public.log_lead_activity(...) in the
--     schema cache"    (logging an activity / follow-up on a lead)
--
-- Root cause: these RPC functions are missing from the live database (schema
-- drift) or PostgREST's in-memory schema cache is stale, so PostgREST cannot
-- resolve them. This migration recreates both functions with the EXACT
-- signatures/parameter names the app calls (mismatched names are a common
-- cause of PGRST202) and forces a schema-cache + config reload.
--
-- Idempotent — safe to re-run or paste into the Supabase SQL editor.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) update_lead_status(p_lead_id, p_status, p_note)
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

-- -----------------------------------------------------------------------------
-- 2) log_lead_activity(p_lead_id, p_type, p_description, p_outcome, p_follow_up)
-- -----------------------------------------------------------------------------
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

-- Refresh PostgREST's schema cache so both RPCs are immediately callable.
-- (Fires on commit, i.e. after the DDL above is visible.)
notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;