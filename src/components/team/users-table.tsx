'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { RoleBadge } from '@/components/team/role-badge';
import { ROLE_LABELS } from '@/lib/constants';
import type { ProfileWithLeadCount, Role } from '@/lib/types';
import { formatDate, initials } from '@/lib/utils';

export function UsersTable({
  users,
  currentUserId,
  manageLevel = 'full',
}: {
  users: ProfileWithLeadCount[];
  currentUserId: string;
  /**
   * 'full' (super admins): can change roles, deactivate / reactivate anyone.
   * 'interns-only' (admins): can only deactivate / reactivate interns.
   */
  manageLevel?: 'full' | 'interns-only';
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{
    user: ProfileWithLeadCount;
    action: 'deactivate' | 'reactivate';
  } | null>(null);

  async function patch(id: string, body: Record<string, unknown>, message: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      toast.success(message);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="h-6 w-6" />}
        title="No team members yet"
        description="Add your first admin or intern to get started."
      />
    );
  }

  const sorted = [...users].sort((a, b) => {
    if (a.role === 'super_admin') return -1;
    if (b.role === 'super_admin') return 1;
    if (a.role === 'admin' && b.role === 'intern') return -1;
    if (b.role === 'admin' && a.role === 'intern') return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  const confirmAction = confirm?.action ?? null;
  const confirmUser = confirm?.user ?? null;

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Leads</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => {
              const isSelf = user.id === currentUserId;
              const isSuperAdmin = user.role === 'super_admin';
              // Admins (interns-only mode) may only manage interns.
              const canManage = manageLevel === 'full' || user.role === 'intern';
              const readOnlyForViewer = !isSelf && !isSuperAdmin && !canManage;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">
                          {initials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {user.full_name}
                          {isSelf && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="font-medium">{user.lead_count ?? 0}</span>
                    <span className="text-muted-foreground"> assigned</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        user.is_active ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      {user.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${user.full_name}`}
                        >
                          {busy === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">
                          {user.full_name}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {!isSelf && !isSuperAdmin && manageLevel === 'full' && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              patch(user.id, { role: 'intern' }, 'Role changed to Intern');
                            }}
                            disabled={busy !== null}
                          >
                            Make Intern
                          </DropdownMenuItem>
                        )}
                        {!isSelf && !isSuperAdmin && manageLevel === 'full' && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              patch(
                                user.id,
                                { role: 'admin' },
                                'Role changed to Admin'
                              );
                            }}
                            disabled={busy !== null}
                          >
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {!isSelf && !isSuperAdmin && canManage && (
                          <DropdownMenuItem
                            className={
                              user.is_active ? 'text-destructive focus:text-destructive' : ''
                            }
                            onSelect={(e) => {
                              e.preventDefault();
                              setConfirm({ user, action: user.is_active ? 'deactivate' : 'reactivate' });
                            }}
                            disabled={busy !== null}
                          >
                            <Ban className="h-4 w-4" />
                            {user.is_active ? 'Deactivate account' : 'Reactivate account'}
                          </DropdownMenuItem>
                        )}
                        {isSuperAdmin && (
                          <DropdownMenuItem disabled>
                            Super admin — cannot be modified
                          </DropdownMenuItem>
                        )}
                        {isSelf && (
                          <DropdownMenuItem disabled>
                            You can&apos;t modify your own account
                          </DropdownMenuItem>
                        )}
                        {readOnlyForViewer && (
                          <DropdownMenuItem disabled>
                            Only interns can be managed
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirmAction === 'deactivate'
            ? `Deactivate ${confirmUser?.full_name ?? 'this user'}?`
            : `Reactivate ${confirmUser?.full_name ?? 'this user'}?`
        }
        description={
          confirmAction === 'deactivate'
            ? `${confirmUser?.full_name} will immediately lose access to the CRM. Their assigned leads stay intact and can be reassigned to someone else.`
            : `${confirmUser?.full_name} will regain access to the CRM.`
        }
        confirmLabel={confirmAction === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        destructive={confirmAction === 'deactivate'}
        onConfirm={async () => {
          if (!confirmUser || !confirmAction) return;
          await patch(
            confirmUser.id,
            { is_active: confirmAction === 'reactivate' },
            confirmAction === 'deactivate' ? 'Account deactivated' : 'Account reactivated'
          );
        }}
      />
    </>
  );
}