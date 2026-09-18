-- =============================================================================
-- Oryntal CRM — Interns add their own leads
--
-- Goal: let interns create leads from the intern panel. To keep the existing
-- visibility rules intact (interns only ever see their own leads; admins see
-- the intern pipeline; super admins see everything), a lead an intern creates
-- MUST be assigned to themselves — this INSERT policy guarantees that.
--
-- Idempotent — safe to re-run or paste into the Supabase SQL Editor.
-- =============================================================================

begin;

drop policy if exists leads_intern_insert on public.leads;

create policy "leads_intern_insert"
  on public.leads for insert
  with check (assigned_to = auth.uid());

commit;