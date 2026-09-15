import type { Role } from '@/lib/types';

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