import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        'overflow-hidden',
        accent &&
          'border-transparent bg-gradient-to-br from-brand to-brand-darker text-white shadow-lg'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <p
              className={cn(
                'text-[0.7rem] font-semibold uppercase tracking-wider',
                accent ? 'text-white/60' : 'text-muted-foreground'
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                'font-display text-3xl font-bold leading-none',
                accent && 'text-gradient-gold'
              )}
            >
              {value}
            </p>
            {hint && (
              <p
                className={cn(
                  'text-xs',
                  accent ? 'text-white/60' : 'text-muted-foreground'
                )}
              >
                {hint}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                accent
                  ? 'bg-white/10 text-brand-accent-light'
                  : 'bg-gradient-gold/15 text-brand-accent-dark'
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}