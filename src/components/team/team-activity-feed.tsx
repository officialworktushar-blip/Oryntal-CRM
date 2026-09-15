import Link from 'next/link';
import { ACTIVITY_ICONS } from '@/components/leads/activity-type-badge';
import type { LeadActivity } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';

export function TeamActivityFeed({
  activities,
}: {
  activities: Array<
    LeadActivity & {
      leads?: { id: string; name: string } | null;
    }
  >;
}) {
  return (
    <ol className="relative space-y-5 border-l-2 border-slate-100 pl-5">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type];
        return (
          <li key={activity.id} className="relative">
            <span className="absolute -left-[27px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
              <Icon className="h-3 w-3 text-brand-accent-dark" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-medium text-foreground">
                {activity.profiles?.full_name ?? 'Unknown'}
              </span>
              <span className="text-muted-foreground">logged</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-accent-dark">
                {activity.type}
              </span>
              <span className="text-muted-foreground">on</span>
              {activity.leads ? (
                <Link
                  href={`/leads/${activity.leads.id}`}
                  className="font-medium text-foreground underline-offset-2 hover:text-brand-accent-dark hover:underline"
                >
                  {activity.leads.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">a deleted lead</span>
              )}
              <span
                className="ml-auto text-xs text-muted-foreground"
                title={formatDateTime(activity.created_at)}
              >
                {timeAgo(activity.created_at)}
              </span>
            </div>
            {(activity.description || activity.outcome) && (
              <div className="mt-2 space-y-0.5 rounded-md bg-slate-50 px-3 py-2">
                {activity.description && (
                  <p className="text-sm text-foreground">
                    {activity.description}
                  </p>
                )}
                {activity.outcome && (
                  <p className="text-xs text-muted-foreground">
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
  );
}