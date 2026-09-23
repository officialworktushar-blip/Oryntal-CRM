'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarClock,
  LayoutDashboard,
  Megaphone,
  Menu,
  Phone,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';
import { BrandLockup } from '@/components/brand/logo';
import { NotificationBell } from '@/components/shell/notification-bell';
import { UserMenu } from '@/components/shell/user-menu';

export interface DashboardUser {
  name: string;
  email?: string | null;
  role: Role;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

function navFor(role: Role): NavItem[] {
  switch (role) {
    case 'super_admin':
      return [
        {
          label: 'Overview',
          href: '/super-admin',
          icon: LayoutDashboard,
          matchExact: true,
        },
        { label: 'My Work', href: '/super-admin?tab=my-work', icon: CalendarClock },
        { label: 'Team', href: '/super-admin?tab=team', icon: Users },
        { label: 'All Leads', href: '/super-admin?tab=leads', icon: Phone },
        {
          label: 'Outreacher',
          href: '/super-admin?tab=outreacher',
          icon: Megaphone,
        },
        { label: 'Analytics', href: '/super-admin?tab=analytics', icon: BarChart3 },
      ];
    case 'admin':
      return [
        {
          label: 'Overview',
          href: '/admin?tab=overview',
          icon: LayoutDashboard,
          matchExact: true,
        },
        { label: 'My Work', href: '/admin?tab=my-work', icon: CalendarClock },
        {
          label: 'Leads',
          href: '/admin?tab=leads',
          icon: Phone,
        },
        { label: 'Team', href: '/admin?tab=team', icon: Users },
        { label: 'Outreacher', href: '/admin?tab=outreacher', icon: Megaphone },
        { label: 'Analytics', href: '/admin?tab=analytics', icon: BarChart3 },
      ];
    case 'intern':
      return [
        {
          label: 'My Leads',
          href: '/intern',
          icon: Phone,
          matchExact: true,
        },
        { label: "Today's Follow-ups", href: '/intern#followups', icon: CalendarClock },
      ];
  }
}

function SidebarNav({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const items = navFor(role);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.matchExact
          ? pathname === item.href.split('?')[0]
          : pathname.startsWith(item.href.split('?')[0]) &&
            (pathname + search).startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                active ? 'text-brand-accent-light' : ''
              )}
            />
            {item.label}
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-gold" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-brand-darker lg:flex">
        <div className="border-b border-white/5 px-5 py-5">
          <BrandLockup />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 pb-28">
          <SidebarNav role={user.role} />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/5 bg-brand-darker p-4">
          <div className="flex items-center gap-3">
            <UserMenu name={user.name} email={user.email} role={user.role} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="truncate text-xs text-white/50">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-brand-darker px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BrandLockup compact />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-brand-darker shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
              <BrandLockup />
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav role={user.role} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-white/5 p-4">
              <div className="flex items-center gap-3">
                <UserMenu
                  name={user.name}
                  email={user.email}
                  role={user.role}
                />
                <p className="truncate text-sm font-medium text-white">
                  {user.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-end border-b bg-background/80 px-8 backdrop-blur lg:flex">
          <NotificationBell />
        </div>
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}