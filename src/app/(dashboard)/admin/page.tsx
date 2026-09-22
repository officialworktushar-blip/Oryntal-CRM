import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import {
  fetchAdmins,
  fetchInterns,
  fetchLeads,
  fetchSuperAdmins,
  type Db,
} from '@/lib/queries';
import { canEditLead } from '@/lib/assign';
import type { Lead, LeadActivity } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { TabNav } from '@/components/shared/tab-nav';
import { LeadsTable } from '@/components/leads/leads-table';
import { AddLeadDialog } from '@/components/leads/add-lead-dialog';
import { CsvImportDialog } from '@/components/leads/csv-import-dialog';
import { MyWorkSection } from '@/components/leads/my-work-section';
import { TeamActivityFeed } from '@/components/team/team-activity-feed';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Admin' };

const TABS = [
  { key: 'my-work', label: 'My Work', href: '/admin?tab=my-work' },
  { key: 'leads', label: 'Leads', href: '/admin?tab=leads' },
  { key: 'activity', label: 'Team Activity', href: '/admin?tab=activity' },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(['admin']);

  const tab =
    typeof searchParams?.tab === 'string' ? searchParams.tab : 'leads';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Workspace"
        description="Keep an eye on every lead your interns are working, manage unassigned leads, and track your own pipeline."
      />
      <TabNav items={TABS} active={tab} basePath="/admin" />

      {tab === 'my-work' && <MyWorkTab />}
      {tab === 'leads' && <LeadsTab defaultSearch={searchParams} />}
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
        canAssign
        canDelete={false}
        canEditLead={(lead: Lead) =>
          canEditLead(session.profile.role, session.user.id, lead)
        }
        basePath="/admin"
        searchParams={defaultSearch ?? {}}
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