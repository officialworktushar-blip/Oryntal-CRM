'use client';

import * as React from 'react';
import Image from 'next/image';
import { BRAND } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Oryntal brand mark. Renders /public/logo.png when present, otherwise falls
 * back to a gold-gradient monogram. Swap in your real logo by dropping a
 * `logo.png` into `/public` (or replace the fallback SVG below).
 */
export function BrandLogo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const [missing, setMissing] = React.useState(false);

  if (!missing) {
    return (
      <Image
        src="/logo.png"
        alt={`${BRAND.name} logo`}
        width={size}
        height={size}
        className={cn('rounded-lg object-contain', className)}
        onError={() => setMissing(true)}
        priority
        unoptimized
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'flex items-center justify-center rounded-lg bg-gradient-gold text-[#06070f] shadow-md',
        className
      )}
      aria-label={`${BRAND.name} logo`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-3/5 w-3/5"
        aria-hidden
      >
        <path
          d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 1.75a7.75 7.75 0 1 1 0 15.5 7.75 7.75 0 0 1 0-15.5Z"
          fill="currentColor"
        />
        <path d="M12 6.5v11M15.5 9h-7" stroke="#06070f" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Wordmark({
  className,
  as: Tag = 'span',
}: {
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <Tag
      className={cn(
        'font-display text-xl font-bold tracking-wide',
        className
      )}
    >
      <span className="text-gradient-gold">{BRAND.name.toUpperCase()}</span>
      <span className="ml-1.5 font-sans text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        CRM
      </span>
    </Tag>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandLogo size={compact ? 36 : 42} />
      {!compact && <Wordmark />}
    </div>
  );
}