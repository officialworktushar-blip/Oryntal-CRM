'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Phone,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EditOutreachContactDialog } from '@/components/outreach/outreach-contact-dialog';
import type { OutreachContact } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';

export function OutreachContactsTable({
  contacts,
}: {
  contacts: OutreachContact[];
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<OutreachContact | null>(null);
  const [editingContact, setEditingContact] = React.useState<OutreachContact | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.phone, c.company, c.platform]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  }, [contacts, query]);

  async function handleLogContact(contact: OutreachContact) {
    setBusyId(contact.id);
    try {
      const res = await fetch(`/api/outreach/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_connected_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to log connection');
      toast.success(`Logged connection with ${contact.name}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log connection');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/outreach/contacts/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      toast.success('Contact deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact');
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg border bg-white p-3 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No matches found' : 'No outreach contacts yet'}
          description={
            query
              ? 'Try a different search.'
              : 'Add your first contact to start tracking outreach.'
          }
          icon={<Search className="h-6 w-6" />}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Platform</TableHead>
                <TableHead>Last connected</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id} className="group">
                  <TableCell>
                    <p className="truncate font-medium text-foreground">
                      {contact.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contact.email || contact.phone || '—'}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contact.company || '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {contact.platform || '—'}
                  </TableCell>
                  <TableCell>
                    {contact.last_connected_at ? (
                      <div>
                        <p className="text-sm">{formatDateTime(contact.last_connected_at)}</p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(contact.last_connected_at)}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        Never contacted
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${contact.name}`}
                        >
                          {busyId === contact.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">
                          {contact.name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleLogContact(contact);
                          }}
                        >
                          <CalendarClock className="h-4 w-4" />
                          Log connection
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setEditingContact(contact);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit contact
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setDeleteTarget(contact);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete contact
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EditOutreachContactDialog
        contact={editingContact}
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This permanently removes this outreach contact. This cannot be undone."
        confirmLabel="Delete contact"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}