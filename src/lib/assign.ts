import type { Lead, Role } from '@/lib/types';

/**
 * Central rule for who a lead may be assigned to:
 * - super_admin: can hand leads to anyone (interns, admins, or herself/himself).
 * - admin: can hand leads to interns, or keep them on her/his own plate (self).
 */
export function canAssignLeadTo(
  assignerRole: Role,
  targetId: string,
  targetRole: Role,
  assignerId: string
): boolean {
  if (assignerRole === 'super_admin') return true;
  if (assignerRole === 'admin') {
    return targetRole === 'intern' || targetId === assignerId;
  }
  return false;
}

/**
 * Whether a user may EDIT a given lead (status, follow-up, notes, reassignment).
 * Admins can only modify the leads they manage — unassigned, their own, or the
 * intern pipeline. Other admins' and super admins' leads are read-only for
 * admins; super admins can edit everything; interns can edit their own leads.
 */
export function canEditLead(
  role: Role,
  userId: string,
  lead: Lead
): boolean {
  if (role === 'super_admin') return true;
  if (role === 'intern') return lead.assigned_to === userId;
  return (
    !lead.assigned_to ||
    lead.assigned_to === userId ||
    lead.assigned_to_profile?.role === 'intern'
  );
}