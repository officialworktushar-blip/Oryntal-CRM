import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle2,
  Phone,
  PhoneCall,
} from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { countThisWeek } from '@/lib/queries';
import type { Lead } from '@/lib/types';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/leads/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { MyLeadsList } from '@/components/intern/my-leads-list';
import { formatDate, todayISO } from '@/lib/utils';

export const metadata: Metadata = { title: 'Intern' };

async function getGreeting(): Promise<string> {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function InternPage() {
  const session = await requireRole(['intern']);
  const { supabase, profile } = session;

  const { data: myLeadsData } = await supabase
    .from('leads')
    .select('*')
    .eq('assigned_to', session.user.id)
    .order('next_follow_up_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(300);

  const myLeads = (myLeadsData ?? []) as Lead[];

  const { data: myActivities } = await supabase
    .from('lead_activities')
    .select('id, created_at')
    .eq('user_id', session.user.id)
    .limit(500);

  const activitiesThisWeek = countThisWeek(myActivities ?? []);

  const today = todayISO();
  const followUpsToday = myLeads.filter(
    (l) => l.next_follow_up_date === today
  );
  const convertedCount = myLeads.filter((l) => l.status === 'converted').length;

  const firstName = profile.full_name.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${await getGreeting()}, ${firstName}`}
        description={formatDate(new Date().toISOString())}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My leads"
          value={myLeads.length}
          icon={<Phone className="h-5 w-5" />}
          hint="Assigned to you"
        />
        <StatCard
          label="Follow-ups today"
          value={followUpsToday.length}
          icon={<CalendarClock className="h-5 w-5" />}
          hint="Due now"
          accent={followUpsToday.length > 0}
        />
        <StatCard
          label="Converted"
          value={convertedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          hint="Great work!"
        />
        <StatCard
          label="My activities"
          value={activitiesThisWeek}
          icon={<PhoneCall className="h-5 w-5" />}
          hint="In the last 7 days"
        />
      </div>

      {/* Today's follow-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Today&apos;s follow-ups
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Leads with a follow-up date of today.
          </p>
        </CardHeader>
        <CardContent>
          {followUpsToday.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title="Nothing due today"
              description="You're all caught up. Enjoy the quiet — check tomorrow's pipeline."
            />
          ) : (
            <ul className="divide-y">
              {followUpsToday.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {lead.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.company || lead.phone || lead.email || lead.source || '—'}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* My leads */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">My leads</CardTitle>
          <p className="text-xs text-muted-foreground">
            Filter, search, and open a lead to log activity.
          </p>
        </CardHeader>
        <CardContent>
          <MyLeadsList leads={myLeads} />
        </CardContent>
      </Card>
    </div>
  );
}