import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@/lib/types';

const ROLE_VARIANTS: Record<Role, 'default' | 'gold' | 'secondary'> = {
  super_admin: 'gold',
  admin: 'default',
  intern: 'secondary',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>;
}