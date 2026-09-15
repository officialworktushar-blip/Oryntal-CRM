import {
  FileText,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import type { ActivityType } from '@/lib/types';

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  meeting: Users,
  note: FileText,
  status_change: RefreshCw,
};

const ACTIVITY_VARIANTS: Record<ActivityType, BadgeProps['variant']> = {
  call: 'blue',
  email: 'violet',
  whatsapp: 'amber',
  meeting: 'default',
  note: 'secondary',
  status_change: 'gold',
};

export function ActivityTypeBadge({
  type,
  className,
}: {
  type: ActivityType;
  className?: string;
}) {
  return (
    <Badge variant={ACTIVITY_VARIANTS[type]} className={className}>
      {ACTIVITY_TYPE_LABELS[type]}
    </Badge>
  );
}