'use client';

import * as React from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const POLL_INTERVAL = 30_000;

export function NotificationBell() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [open, setOpen] = React.useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = React.useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as Notification[];
      setNotifications(data);
    } catch {
      // ignore network flickers
    }
  }, []);

  React.useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_INTERVAL);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readAll: true }),
    });
    load();
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    load();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-gold px-1 text-[0.6rem] font-bold text-[#06070f]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        onInteractOutside={() => setOpen(false)}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-brand-accent-dark"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="scrollbar-thin max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
                      !n.is_read ? 'bg-gradient-gold/[0.06]' : ''
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.is_read ? 'bg-transparent' : 'bg-brand-accent'
                      }`}
                    />
                    <span className="flex-1 space-y-0.5">
                      <span
                        className={`block text-sm ${
                          n.is_read ? 'text-foreground/70' : 'font-medium text-foreground'
                        }`}
                      >
                        {n.message}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}