import 'server-only';

import type { createClient } from '@/lib/supabase/server';
import type { Lead, Profile } from '@/lib/types';
import { LEAD_STATUS_ORDER } from '@/lib/constants';

export type Db = Awaited<ReturnType<typeof createClient>>;

export interface LeadFilters {
  status?: string;
  source?: string;
  assigned?: string;
  from?: string;
  to?: string;
}

const LEAD_SELECT = `*, assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, role), created_by_profile:profiles!leads_created_by_fkey(id, full_name, role)`;

export async function fetchLeads(
  supabase: Db,
  filters: LeadFilters = {}
): Promise<Lead[]> {
  let query = supabase.from('leads').select(LEAD_SELECT);

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.source && filters.source !== 'all') query = query.eq('source', filters.source);
  if (filters.assigned === 'unassigned') query = query.is('assigned_to', null);
  else if (filters.assigned && filters.assigned !== 'all') query = query.eq('assigned_to', filters.assigned);
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('fetchLeads error:', error);
    return [];
  }
  return (data as Lead[]) ?? [];
}

export async function fetchAllLeads(supabase: Db): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('fetchAllLeads error:', error);
    return [];
  }
  return (data as Lead[]) ?? [];
}

export async function fetchInterns(supabase: Db): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'intern')
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error('fetchInterns error:', error);
    return [];
  }
  return (data as Profile[]) ?? [];
}

/** Count of activities created in the last 7 days. */
export function countThisWeek(activities: Array<{ created_at: string }>) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return activities.filter((a) => new Date(a.created_at) >= cutoff).length;
}

/** Aggregates used across dashboards. */
export interface LeadAnalytics {
  byStatus: Array<{ status: string; count: number }>;
  overTime: Array<{ date: string; count: number }>;
  perIntern: Array<{ name: string; count: number }>;
  funnel: Array<{ label: string; count: number }>;
  total: number;
  converted: number;
  conversionRate: number;
  newThisMonth: number;
  convertedThisMonth: number;
}

export function computeAnalytics(
  leads: Lead[],
  interns: Profile[],
  monthStart: Date
): LeadAnalytics {
  const total = leads.length;
  const converted = leads.filter((l) => l.status === 'converted').length;

  const byStatus = LEAD_STATUS_ORDER.map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
  }));

  const countsByDate = new Map<string, number>();
  for (const lead of leads) {
    const d = lead.created_at.slice(0, 10);
    countsByDate.set(d, (countsByDate.get(d) ?? 0) + 1);
  }
  const overTime = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { date: iso.slice(5), count: countsByDate.get(iso) ?? 0 };
  });

  const perIntern = interns.map((intern) => ({
    name: intern.full_name,
    count: leads.filter((l) => l.assigned_to === intern.id).length,
  }));

  const funnel = [
    { label: 'New', count: leads.filter((l) => l.status === 'new').length },
    {
      label: 'Engaged',
      count: leads.filter((l) =>
        ['contacted', 'follow_up', 'interested', 'not_interested'].includes(l.status)
      ).length,
    },
    { label: 'Interested', count: leads.filter((l) => l.status === 'interested').length },
    { label: 'Converted', count: converted },
  ];

  const thisMonth = leads.filter((l) => new Date(l.created_at) >= monthStart);
  const convertedThisMonth = thisMonth.filter((l) => l.status === 'converted').length;
  const conversionRate =
    thisMonth.length > 0
      ? Math.round((convertedThisMonth / thisMonth.length) * 1000) / 10
      : 0;

  return {
    byStatus,
    overTime,
    perIntern,
    funnel,
    total,
    converted,
    conversionRate,
    newThisMonth: thisMonth.length,
    convertedThisMonth,
  };
}