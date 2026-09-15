import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { fetchInterns, fetchLeads, type Db } from '@/lib/queries';
import type { LeadActivity } from '@/lib/types';
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
        description="Manage every lead, keep an eye on your interns' activity, and track your own pipeline."
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

  const [leads, interns] = await Promise.all([
    fetchLeads(session.supabase, filters),
    fetchInterns(session.supabase),
  ]);

  const members = [...interns, session.profile];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">All leads</h2>
          <p className="text-sm text-muted-foreground">
            {leads.length} shown · assign leads to your team or to yourself.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog />
          <AddLeadDialog members={members} variant="gold" />
        </div>
      </div>
      <LeadsTable
        leads={leads}
        members={members}
        canAssign
        canDelete={false}
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
          by all interns.
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
  return (data as LeadActivity[]) ?? [];
}

function stringValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}