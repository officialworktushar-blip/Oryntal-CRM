import { Badge, type BadgeProps } from '@/components/ui/badge';
import { LEAD_STATUS_LABELS } from '@/lib/constants';
import type { LeadStatus } from '@/lib/types';

const STATUS_VARIANTS: Record<LeadStatus, BadgeProps['variant']> = {
  new: 'blue',
  contacted: 'violet',
  follow_up: 'amber',
  interested: 'default',
  not_interested: 'neutral',
  converted: 'success',
  lost: 'destructive',
};

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={className}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}