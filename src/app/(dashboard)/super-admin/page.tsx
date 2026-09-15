import type { Metadata } from 'next';
import {
  CalendarClock,
  Gauge,
  Layers,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import {
  computeAnalytics,
  fetchAllLeads,
  fetchInterns,
  fetchLeads,
  type Db,
} from '@/lib/queries';
import type { ProfileWithLeadCount } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { TabNav } from '@/components/shared/tab-nav';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadsTable } from '@/components/leads/leads-table';
import { AddLeadDialog } from '@/components/leads/add-lead-dialog';
import { CsvImportDialog } from '@/components/leads/csv-import-dialog';
import { AddUserDialog } from '@/components/team/add-user-dialog';
import { UsersTable } from '@/components/team/users-table';
import { LeadsByStatusBreakdown } from '@/components/analytics/leads-by-status-breakdown';
import {
  ConversionFunnel,
  LeadsByStatusChart,
  LeadsOverTimeChart,
  LeadsPerInternChart,
} from '@/components/analytics/charts';

export const metadata: Metadata = { title: 'Super Admin' };

const TABS = [
  { key: 'overview', label: 'Overview', href: '/super-admin?tab=overview' },
  { key: 'team', label: 'Team', href: '/super-admin?tab=team' },
  { key: 'leads', label: 'All Leads', href: '/super-admin?tab=leads' },
  { key: 'analytics', label: 'Analytics', href: '/super-admin?tab=analytics' },
];

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(['super_admin']);

  const tab =
    typeof searchParams?.tab === 'string' ? searchParams.tab : 'overview';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Company-wide overview of leads, team, and performance."
      />
      <TabNav items={TABS} active={tab} basePath="/super-admin" />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'team' && <TeamTab />}
      {tab === 'leads' && <LeadsTab defaultSearch={searchParams} />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}

async function OverviewTab() {
  const session = await requireRole(['super_admin']);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allLeads, interns, { data: profilesData }] = await Promise.all([
    fetchAllLeads(session.supabase),
    fetchInterns(session.supabase),
    session.supabase.from('profiles').select('role, is_active'),
  ]);

  const activeInterns = (
    (profilesData ?? []) as Array<{ role: string; is_active: boolean }>
  ).filter((p) => p.role === 'intern' && p.is_active).length;
  const activeAdmins = (
    (profilesData ?? []) as Array<{ role: string; is_active: boolean }>
  ).filter((p) => p.role === 'admin' && p.is_active).length;

  const analytics = computeAnalytics(allLeads, interns, monthStart);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total leads"
          value={analytics.total}
          icon={<Layers className="h-5 w-5" />}
          hint={`${analytics.newThisMonth} this month`}
        />
        <StatCard
          label="Active interns"
          value={activeInterns}
          icon={<Users className="h-5 w-5" />}
          hint="Working the pipeline"
        />
        <StatCard
          label="Active admins"
          value={activeAdmins}
          icon={<ShieldCheck className="h-5 w-5" />}
          hint="Management"
        />
        <StatCard
          label="Conversion rate"
          value={`${analytics.conversionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          hint={`${analytics.convertedThisMonth} converted this month`}
          accent
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Leads by status
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
              All-time distribution
            </p>
          </CardHeader>
          <CardContent>
            <LeadsByStatusBreakdown leads={allLeads} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Pipeline health
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              <Gauge className="mr-1 inline h-3.5 w-3.5" />
              Quick snapshot
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Converted', value: analytics.converted, className: 'text-emerald-600' },
                { label: 'Interested', value: analytics.byStatus.find((b) => b.status === 'interested')?.count ?? 0, className: 'text-brand-accent-dark' },
                { label: 'Needing follow-up', value: analytics.byStatus.find((b) => b.status === 'follow_up')?.count ?? 0, className: 'text-amber-600' },
                { label: 'Unassigned', value: allLeads.filter((l) => !l.assigned_to).length, className: 'text-slate-500' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-slate-50 p-4"
                >
                  <p className={`font-display text-2xl font-bold ${item.className}`}>
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function TeamTab() {
  const session = await requireRole(['super_admin']);
  const { data } = await session.supabase
    .from('profiles')
    .select('*, leads:leads!leads_assigned_to_fkey(count)')
    .order('created_at', { ascending: false });

  const users = (
    (data ?? []) as Array<ProfileWithLeadCount & { leads: Array<{ count: number }> }>
  ).map((p) => ({ ...p, lead_count: p.leads?.[0]?.count ?? 0 }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Team</h2>
          <p className="text-sm text-muted-foreground">
            Manage admins and interns. Super admin accounts cannot be
            modified or deleted.
          </p>
        </div>
        <AddUserDialog canCreateAdmin />
      </div>
      <UsersTable users={users} currentUserId={session.user.id} />
    </div>
  );
}

async function LeadsTab({
  defaultSearch,
}: {
  defaultSearch?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireRole(['super_admin']);
  const filters = {
    status: stringValue(defaultSearch?.status),
    source: stringValue(defaultSearch?.source),
    assigned: stringValue(defaultSearch?.assigned),
    from: stringValue(defaultSearch?.from),
    to: stringValue(defaultSearch?.to),
  };

  const [leads, interns] = await Promise.all([
    fetchLeads(session.supabase, filters),
    fetchInterns(session.supabase),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">All leads</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} shown · filter, reassign, and import.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog />
          <AddLeadDialog interns={interns} variant="gold" />
        </div>
      </div>
      <LeadsTable
        leads={leads}
        interns={interns}
        canAssign
        canDelete
        basePath="/super-admin"
        searchParams={defaultSearch ?? {}}
      />
    </div>
  );
}

async function AnalyticsTab() {
  const session = await requireRole(['super_admin']);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allLeads, interns] = await Promise.all([
    fetchAllLeads(session.supabase),
    fetchInterns(session.supabase),
  ]);
  const analytics = computeAnalytics(allLeads, interns, monthStart);

  const chartCard = 'rounded-lg border bg-white';
  const chartTitle = 'font-display text-lg';

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={chartCard}>
          <div className="border-b p-5">
            <h2 className={chartTitle}>Leads by status</h2>
          </div>
          <div className="p-4">
            <LeadsByStatusChart data={analytics.byStatus} />
          </div>
        </div>
        <div className={chartCard}>
          <div className="border-b p-5">
            <h2 className={chartTitle}>Leads over time</h2>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <div className="p-4">
            <LeadsOverTimeChart data={analytics.overTime} />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={chartCard}>
          <div className="border-b p-5">
            <h2 className={chartTitle}>Leads per intern</h2>
          </div>
          <div className="p-4">
            {interns.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No active interns yet.
              </p>
            ) : (
              <LeadsPerInternChart data={analytics.perIntern} />
            )}
          </div>
        </div>
        <div className={chartCard}>
          <div className="border-b p-5">
            <h2 className={chartTitle}>Conversion funnel</h2>
            <p className="text-xs text-muted-foreground">
              New → Engaged → Interested → Converted
            </p>
          </div>
          <div className="p-6">
            <ConversionFunnel stages={analytics.funnel} />
          </div>
        </div>
      </div>
    </div>
  );
}

function stringValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}