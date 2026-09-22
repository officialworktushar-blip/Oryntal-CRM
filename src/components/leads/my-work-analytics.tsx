'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  PhoneCall,
  Users2,
} from 'lucide-react';
import {
  ACTIVITY_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
} from '@/lib/constants';
import type { Lead } from '@/lib/types';
import {
  LeadsByStatusChart,
  LeadsOverTimeChart,
} from '@/components/analytics/charts';

const STATUS_CHANNELS = ['call', 'email', 'whatsapp', 'meeting'] as const;

/**
 * Personal analytics for a member: their lead pipeline by status, activity
 * volume over time, and how their effort breaks down by channel.
 */
export function MyWorkAnalytics({
  leads,
  activities,
  days = 14,
}: {
  leads: Lead[];
  activities: Array<{ created_at: string; type: string }>;
  days?: number;
}) {
  const byStatus = LEAD_STATUS_ORDER.map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekCutoff = new Date();
  weekCutoff.setDate(weekCutoff.getDate() - 7);

  const totalActivities = activities.length;
  const activitiesThisWeek = activities.filter(
    (a) => new Date(a.created_at) >= weekCutoff
  ).length;
  const convertedThisMonth = leads.filter(
    (l) => l.status === 'converted' && new Date(l.created_at) >= monthStart
  ).length;

  const channels = STATUS_CHANNELS.map((type) => ({
    type,
    label: ACTIVITY_TYPE_LABELS[type],
    count: activities.filter((a) => a.type === type).length,
  }));

  const volumeSeries = useActivitySeries(activities, days);

  const chartBox = 'rounded-lg border bg-white';
  const chartTitle = 'font-display text-sm font-semibold';

  return (
    <div className="space-y-4">
      {/* Channel mix */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ChannelTile
          icon={<PhoneCall className="h-4 w-4" />}
          label="Calls"
          value={channels[0].count}
          hint="Logged"
        />
        <ChannelTile
          icon={<Mail className="h-4 w-4" />}
          label="Emails"
          value={channels[1].count}
          hint="Logged"
        />
        <ChannelTile
          icon={<MessageCircle className="h-4 w-4" />}
          label="WhatsApp"
          value={channels[2].count}
          hint="Logged"
        />
        <ChannelTile
          icon={<Users2 className="h-4 w-4" />}
          label="Meetings"
          value={channels[3].count}
          hint="Logged"
        />
      </div>

      {/* Leads by status + activity volume */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={chartBox}>
          <div className="border-b p-4">
            <p className={chartTitle}>Leads by status</p>
            <p className="text-xs text-muted-foreground">
              {leads.length} leads in your pipeline
            </p>
          </div>
          <div className="p-3">
            <LeadsByStatusChart data={byStatus} />
          </div>
        </div>
        <div className={chartBox}>
          <div className="border-b p-4">
            <p className={chartTitle}>Activity volume</p>
            <p className="text-xs text-muted-foreground">
              Last {days} days · {activitiesThisWeek} this week ·{' '}
              {convertedThisMonth} converted this month
            </p>
          </div>
          <div className="p-3">
            <LeadsOverTimeChart data={volumeSeries} />
          </div>
        </div>
      </div>

      {/* Status summary strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pipeline:
        </span>
        {byStatus.map((s) => (
          <span
            key={s.status}
            className="inline-flex items-center gap-1.5 rounded-full border bg-slate-50 px-2.5 py-1 text-xs"
          >
            <span className="font-medium text-foreground">
              {LEAD_STATUS_LABELS[s.status as keyof typeof LEAD_STATUS_LABELS]}
            </span>
            <span className="font-semibold text-brand-accent-dark">
              {s.count}
            </span>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium text-foreground">Total activities</span>
          <span className="font-semibold text-emerald-700">
            {totalActivities}
          </span>
        </span>
      </div>
    </div>
  );
}

function ChannelTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-brand-accent-dark shadow-sm">
          {icon}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-right">
        <p className="font-display text-xl font-bold leading-none">{value}</p>
        <p className="text-[0.65rem] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** Activity counts per day (local dates), oldest → newest. */
function useActivitySeries(
  activities: Array<{ created_at: string }>,
  days: number
): Array<{ date: string; count: number }> {
  return React.useMemo(() => {
    const buckets = new Map<string, number>();
    for (const a of activities) {
      const key = localDay(a.created_at);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    const points: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      points.push({
        date: key.slice(5),
        count: buckets.get(key) ?? 0,
      });
    }
    return points;
  }, [activities, days]);
}

/** Local-time `YYYY-MM-DD` for a timestamp, matching `todayISO()` semantics. */
function localDay(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}