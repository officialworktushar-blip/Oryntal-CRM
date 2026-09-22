import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  Headset,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { getAuthSession } from '@/lib/auth';
import { canEditLead } from '@/lib/assign';
import type { Lead, LeadActivity } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/leads/status-badge';
import { ActivityTypeBadge, ACTIVITY_ICONS } from '@/components/leads/activity-type-badge';
import { StatusSelect } from '@/components/leads/status-select';
import { ActivityForm } from '@/components/leads/activity-form';
import { formatDate, formatDateTime, timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'Lead details' };

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getAuthSession();
  if (!session) redirect('/login');

  const { supabase } = session;

  // RLS: interns only ever see leads assigned to them.
  const { data: leadData } = await supabase
    .from('leads')
    .select(
      '*, assigned_to_profile:profiles!leads_assigned_to_fkey(id, full_name, role), created_by_profile:profiles!leads_created_by_fkey(id, full_name, role)'
    )
    .eq('id', params.id)
    .maybeSingle();

  const lead = leadData as Lead | null;
  if (!lead) notFound();

  // Admins can read every lead but only edit unassigned, their own, or intern
  // leads. Others' leads (other admins & super admins) are view-only for them.
  const editable = canEditLead(session.profile.role, session.user.id, lead);

  const { data: activitiesData } = await supabase
    .from('lead_activities')
    .select('*, profiles:profiles!lead_activities_user_id_fkey(id, full_name, role)')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const activities = (activitiesData ?? []) as LeadActivity[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {lead.name}
            </h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Added {formatDateTime(lead.created_at)}
            {lead.created_by_profile && (
              <>
                {' '}by{' '}
                <span className="font-medium text-foreground">
                  {lead.created_by_profile.full_name}
                </span>
              </>
            )}
          </p>
        </div>
        {lead.assigned_to_profile && (
          <Badge variant="gold" className="gap-1.5 px-3 py-1 text-sm">
            <UserRound className="h-3.5 w-3.5" />
            {lead.assigned_to_profile.full_name}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact info */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Contact details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </dt>
                  <dd className="text-sm font-medium">
                    {lead.phone ? (
                      <a href={`tel:${lead.phone}`} className="hover:text-brand-accent-dark hover:underline">
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </dt>
                  <dd className="text-sm font-medium">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="hover:text-brand-accent-dark hover:underline">
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> Company
                  </dt>
                  <dd className="text-sm font-medium">{lead.company || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Source
                  </dt>
                  <dd className="text-sm font-medium">{lead.source || '—'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Headset className="h-3.5 w-3.5" /> Priority
                  </dt>
                  <dd className="text-sm font-medium capitalize">
                    {lead.priority || 'medium'}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" /> Next follow-up
                  </dt>
                  <dd className="text-sm font-medium">
                    {lead.next_follow_up_date ? (
                      <span className={isToday(lead.next_follow_up_date) ? 'font-semibold text-brand-accent-dark' : ''}>
                        {formatDate(lead.next_follow_up_date)}
                        {isToday(lead.next_follow_up_date) && ' — today'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </dd>
                </div>
              </dl>
              {lead.notes && (
                <div className="mt-5 rounded-md bg-slate-50 p-4">
                  <p className="text-sm whitespace-pre-wrap italic text-muted-foreground">
                    {lead.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Activity timeline</CardTitle>
              <p className="text-xs text-muted-foreground">Newest first</p>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <EmptyState
                  icon={<Headset className="h-6 w-6" />}
                  title="No activity yet"
                  description="Log your first call, email, or note for this lead."
                />
              ) : (
                <ol className="relative space-y-6 border-l-2 border-slate-100 pl-5">
                  {activities.map((activity) => {
                    const Icon = ACTIVITY_ICONS[activity.type];
                    return (
                      <li key={activity.id} className="relative">
                        <span className="absolute -left-[27px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
                          <Icon className="h-3 w-3 text-brand-accent-dark" />
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <ActivityTypeBadge type={activity.type} />
                          <span className="text-xs text-muted-foreground">
                            {activity.profiles?.full_name || 'Unknown'} ·{' '}
                            <span title={formatDateTime(activity.created_at)}>
                              {timeAgo(activity.created_at)}
                            </span>
                          </span>
                        </div>
                        {(activity.description || activity.outcome) && (
                          <div className="mt-1.5 space-y-0.5 rounded-md bg-slate-50 px-3 py-2 text-sm">
                            {activity.description && (
                              <p className="text-foreground">{activity.description}</p>
                            )}
                            {activity.outcome && (
                              <p className="text-muted-foreground">
                                <span className="font-medium text-foreground/70">
                                  Outcome:
                                </span>{' '}
                                {activity.outcome}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {!editable && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  View only
                </p>
                <p className="mt-0.5 text-amber-800/80">
                  This lead is owned by another admin or a super admin. You can
                  review it but not change its status or log activities.
                </p>
              </div>
            </div>
          )}

          {editable && (
            <Card className="bg-brand text-white">
              <CardHeader>
                <CardTitle className="font-display text-lg text-white">
                  Current status
                </CardTitle>
                <p className="text-xs text-white/50">
                  Click a status below to update it — changes are logged
                  automatically.
                </p>
              </CardHeader>
              <CardContent>
                <StatusSelect leadId={lead.id} status={lead.status} />
              </CardContent>
            </Card>
          )}

          {editable && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Log an activity</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Record a call, email, WhatsApp, meeting, or note.
                </p>
              </CardHeader>
              <CardContent>
                <ActivityForm leadId={lead.id} />
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-brand-accent-dark" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assigned to
              </span>
            </div>
            <p className="mt-2 text-sm font-medium">
              {lead.assigned_to_profile?.full_name ?? 'Unassigned'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function isToday(date: string): boolean {
  const d = new Date(`${date}T00:00:00`);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}