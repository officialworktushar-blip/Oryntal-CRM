import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '@/lib/constants';
import type { Lead } from '@/lib/types';

export function LeadsByStatusBreakdown({
  leads,
}: {
  leads: Lead[];
}) {
  const total = Math.max(leads.length, 1);
  return (
    <div className="space-y-3">
      {LEAD_STATUS_ORDER.map((status) => {
        const count = leads.filter((l) => l.status === status).length;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={status} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="font-semibold text-foreground">
                {count} <span className="font-normal text-muted-foreground">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-accent-dark to-brand-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}