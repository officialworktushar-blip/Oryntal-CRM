import 'server-only';

import { canEditLead } from '@/lib/assign';
import type { Lead, Role } from '@/lib/types';
import type { Db } from '@/lib/queries';

/** Shown wherever a write is refused because the lead belongs to someone else. */
export const LEAD_VIEW_ONLY_MESSAGE =
  'This lead is owned by another admin or a super admin. You can review it but not change its status or log activities.';

const LEAD_WITH_OWNER = `*, assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, role)`;

export interface LeadAccess {
  /** null when the profile row is missing/inactive. */
  role: Role | null;
  /** null when the lead is missing or invisible under RLS. */
  lead: Lead | null;
  canEdit: boolean;
}

/**
 * Loads the caller's role and the target lead, then applies the same
 * `canEditLead` rule the lead detail page uses for its UI. The page gate is
 * cosmetic on its own — this keeps the write endpoints in step with it.
 */
export async function loadLeadAccess(
  supabase: Db,
  userId: string,
  leadId: string
): Promise<LeadAccess> {
  const [{ data: me }, { data: leadData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('leads').select(LEAD_WITH_OWNER).eq('id', leadId).maybeSingle(),
  ]);

  const profile = me as { role: Role; is_active: boolean } | null;
  const lead = (leadData as Lead | null) ?? null;
  const role = profile?.is_active ? profile.role : null;

  return {
    role,
    lead,
    canEdit: role !== null && lead !== null && canEditLead(role, userId, lead),
  };
}
