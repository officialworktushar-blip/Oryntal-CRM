'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarClock,
  ChevronRight,
  Phone,
  Search,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/leads/status-badge';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '@/lib/constants';
import type { Lead, LeadStatus } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export function MyLeadsList({
  leads,
  emptyTitle = 'No leads assigned yet',
  emptyDescription = 'When your admins assign you leads, they will show up here.',
}: {
  leads: Lead[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [status, setStatus] = React.useState<'all' | LeadStatus>('all');
  const [query, setQuery] = React.useState('');

  const counts = React.useMemo(() => {
    const m = new Map<LeadStatus, number>();
    for (const l of leads) m.set(l.status, (m.get(l.status) ?? 0) + 1);
    return m;
  }, [leads]);

  const filtered = React.useMemo(() => {
    let list = leads;
    if (status !== 'all') list = list.filter((l) => l.status === status);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((l) =>
        [l.name, l.company, l.email, l.phone]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      );
    }
    return list;
  }, [leads, status, query]);

  const pills: Array<{ key: 'all' | LeadStatus; label: string; count: number }> = [
    { key: 'all', label: 'All', count: leads.length },
    ...LEAD_STATUS_ORDER.map((s) => ({
      key: s as 'all' | LeadStatus,
      label: LEAD_STATUS_LABELS[s],
      count: counts.get(s) ?? 0,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your leads…"
            className="h-9 w-full rounded-md border border-input bg-white pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-xs"
          />
        </div>
        <div className="scrollbar-thin flex w-full items-center gap-1.5 overflow-x-auto pb-1">
          {pills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setStatus(pill.key)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                status === pill.key
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 bg-white text-muted-foreground hover:border-brand-accent hover:text-brand-accent-dark'
              )}
            >
              {pill.label}
              <span
                className={cn(
                  'ml-1.5',
                  status === pill.key ? 'text-brand-accent-light' : 'text-muted-foreground/70'
                )}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Phone className="h-6 w-6" />}
          title={leads.length === 0 ? emptyTitle : 'No leads match'}
          description={
            leads.length === 0
              ? emptyDescription
              : 'Try a different status or search term.'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                className="group flex h-full items-start justify-between gap-3 rounded-lg border bg-white p-4 transition-all hover:border-brand-accent hover:shadow-md"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold text-foreground group-hover:text-brand-accent-dark">
                      {lead.name}
                    </p>
                    <StatusBadge status={lead.status} className="shrink-0" />
                  </div>
                  {(lead.company || lead.email || lead.phone) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {lead.company || lead.email || lead.phone}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {lead.source || 'No source'}
                  </p>
                  {lead.next_follow_up_date && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-brand-accent-dark">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Follow-up {formatDate(lead.next_follow_up_date)}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-accent-dark" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}