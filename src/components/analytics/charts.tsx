'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LEAD_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const GOLD = '#c9a84c';
const NAVY = '#0d1230';

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(13,18,48,0.08)',
};

export function LeadsByStatusChart({
  data,
}: {
  data: Array<{ status: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data.map((d) => ({
          ...d,
          label: LEAD_STATUS_LABELS[d.status as keyof typeof LEAD_STATUS_LABELS] ?? d.status,
        }))}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        barSize={34}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(201,168,76,0.08)' }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value} lead(s)`, 'Count']}
        />
        <Bar dataKey="count" fill={GOLD} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeadsOverTimeChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value}`, 'Leads']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={NAVY}
          strokeWidth={2}
          fill="url(#leadsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LeadsPerInternChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        layout="vertical"
        barSize={18}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(201,168,76,0.08)' }}
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value} lead(s)`, 'Assigned']}
        />
        <Bar dataKey="count" fill={NAVY} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionFunnel({
  stages,
}: {
  stages: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      {stages.map((stage, i) => {
        const width = Math.max(14, Math.round((stage.count / max) * 100));
        return (
          <div
            key={stage.label}
            className="w-full"
            style={{ maxWidth: 420 }}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                <span className="mr-1.5 text-primary/40">{i + 1}.</span>
                {stage.label}
              </span>
              <span className="font-semibold text-foreground">
                {stage.count}
              </span>
            </div>
            <div className="flex justify-center">
              <div
                className={cn(
                  'h-7 rounded-md transition-all duration-500',
                  i === stages.length - 1
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : i === 0
                      ? 'bg-gradient-to-r from-brand-accent-dark to-brand-accent'
                      : 'bg-gradient-to-r from-brand/[0.85] to-brand'
                )}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}