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
  fetchAdmins,
  fetchAllLeads,
  fetchInterns,
  fetchLeads,
  fetchSuperAdmins,
  type Db,
} from '@/lib/queries';
import { canEditLead } from '@/lib/assign';
import type { Lead, LeadActivity, ProfileWithLeadCount } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { TabNav } from '@/components/shared/tab-nav';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadsTable } from '@/components/leads/leads-table';
import { AddLeadDialog } from '@/components/leads/add-lead-dialog';
import { CsvImportDialog } from '@/components/leads/csv-import-dialog';
import { MyWorkSection } from '@/components/leads/my-work-section';
import { TeamActivityFeed } from '@/components/team/team-activity-feed';
import { UsersTable } from '@/components/team/users-table';
import { AddUserDialog } from '@/components/team/add-user-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { LeadsByStatusBreakdown } from '@/components/analytics/leads-by-status-breakdown';

export const metadata: Metadata = { title: 'Admin' };

const TABS = [
  { key: 'overview', label: 'Overview', href: '/admin?tab=overview' },
  { key: 'my-work', label: 'My Work', href: '/admin?tab=my-work' },
  { key: 'leads', label: 'Leads', href: '/admin?tab=leads' },
  { key: 'team', label: 'Team', href: '/admin?tab=team' },
  { key: 'activity', label: 'Team Activity', href: '/admin?tab=activity' },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(['admin']);

  const tab =
    typeof searchParams?.tab === 'string' ? searchParams.tab : 'overview';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Workspace"
        description="Keep an eye on every lead your team is working, manage unassigned leads, and track your own pipeline."
      />
      <TabNav items={TABS} active={tab} basePath="/admin" />

      {tab === 'overview' && <OverviewTab />}
      {tab === 'my-work' && <MyWorkTab />}
      {tab === 'leads' && <LeadsTab defaultSearch={searchParams} />}
      {tab === 'team' && <TeamTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}

async function MyWorkTab() {
  const session = await requireRole(['admin']);
  return (
    <MyWorkSection
      session={session}
      emptyDescription="Leads you assign to yourself will show up here."
    />
  );
}

async function OverviewTab() {
  const session = await requireRole(['admin']);
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

async function LeadsTab({
  defaultSearch,
}: {
  defaultSearch?: Record<string, string | string[] | undefined>;
}) {
  const session = await requireRole(['admin']);
  const filters = {
    status: stringValue(defaultSearch?.status),
    source: stringValue(defaultSearch?.source),
    assigned: stringValue(defaultSearch?.assigned),
    from: stringValue(defaultSearch?.from),
    to: stringValue(defaultSearch?.to),
  };

  const [leads, interns, admins, superAdmins] = await Promise.all([
    fetchLeads(session.supabase, filters),
    fetchInterns(session.supabase),
    fetchAdmins(session.supabase),
    fetchSuperAdmins(session.supabase),
  ]);

  // Scope: admins can READ every lead — unassigned, the intern pipeline
  // (assigned by any admin or super admin), other admins' and super admins'
  // personal leads (so they can review each other's work), and their own.
  // Editing stays limited to what they manage (unassigned / own / intern).
  const scopedLeads = leads.filter(
    (l) =>
      !l.assigned_to ||
      l.assigned_to === session.profile.id ||
      l.assigned_to_profile?.role === 'intern' ||
      l.assigned_to_profile?.role === 'admin' ||
      l.assigned_to_profile?.role === 'super_admin'
  );

  // Only the leads this admin can actually work get the assign menu.
  const editableLeadIds = scopedLeads
    .filter((l) => canEditLead(session.profile.role, session.user.id, l))
    .map((l) => l.id);

  // Who a lead can be HANDED to (assign) — interns and yourself.
  const members = [...interns, session.profile];
  // Everyone whose leads an admin can see — used to filter the table.
  const filterMembers = [...interns, ...admins, ...superAdmins, session.profile];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">All leads</h2>
          <p className="text-sm text-muted-foreground">
            {scopedLeads.length} shown · see everyone&apos;s work; only
            unassigned, intern, and your own leads can be edited.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog />
          <AddLeadDialog members={members} variant="gold" />
        </div>
      </div>
      <LeadsTable
        leads={scopedLeads}
        members={members}
        filterMembers={filterMembers}
        editableLeadIds={editableLeadIds}
        canAssign
        canDelete={false}
        basePath="/admin"
        searchParams={defaultSearch ?? {}}
      />
    </div>
  );
}

async function TeamTab() {
  const session = await requireRole(['admin']);

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
            Your team at a glance. You can add interns and manage their
            accounts — admins and super admins are read-only for you.
          </p>
        </div>
        <AddUserDialog />
      </div>
      <UsersTable
        users={users}
        currentUserId={session.user.id}
        manageLevel="interns-only"
      />
    </div>
  );
}

async function ActivityTab() {
  const session = await requireRole(['admin']);
  const { supabase } = session;

  const activities = await fetchRecentActivities(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Team activity</h2>
        <p className="text-sm text-muted-foreground">
          Latest calls, emails, WhatsApp messages, meetings, and notes logged
          by your team.
        </p>
      </div>
      {activities.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Once interns start logging calls and follow-ups, you'll see the feed here."
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <TeamActivityFeed activities={activities} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function fetchRecentActivities(supabase: Db): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select(
      '*, leads(id, name, status), profiles:profiles!lead_activities_user_id_fkey(id, full_name, role)'
    )
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    console.error('fetchRecentActivities error:', error);
    return [];
  }
  const rows = (data as LeadActivity[]) ?? [];
  // Drop activities whose lead is hidden from this admin by RLS (the embedded
  // `leads` relation comes back null for leads they can't see).
  return rows.filter((a) => {
    const leads = (a as LeadActivity & { leads?: unknown }).leads;
    return leads != null;
  });
}

function stringValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}