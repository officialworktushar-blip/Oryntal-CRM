'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LeadStatus } from '@/lib/types';
import { LEAD_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/leads/status-badge';

export function StatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleChange(next: LeadStatus, note?: string) {
    if (next === status || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next, note: note || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      toast.success(`Status → ${LEAD_STATUS_LABELS[next]}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} className="text-sm" />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[])
          .filter((s) => s !== status)
          .map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => handleChange(s)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                'border-slate-200 bg-white text-muted-foreground hover:border-brand-accent hover:text-brand-accent-dark',
                'disabled:opacity-50'
              )}
            >
              {LEAD_STATUS_LABELS[s]}
            </button>
          ))}
      </div>
    </div>
  );
}