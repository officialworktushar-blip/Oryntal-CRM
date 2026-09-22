'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  FilterX,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  UserRoundCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { StatusBadge } from '@/components/leads/status-badge';
import { LEAD_SOURCES, LEAD_STATUS_LABELS } from '@/lib/constants';
import type { Lead, LeadStatus } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

const PAGE_SIZE = 10;

export function LeadsTable({
  leads,
  members,
  canAssign,
  canDelete,
  basePath,
  searchParams,
  filterMembers,
  editableLeadIds,
  emptyTitle = 'No leads found',
  emptyDescription = 'Try adjusting the filters, or add a new lead.',
}: {
  leads: Lead[];
  members: Array<{ id: string; full_name: string }>;
  canAssign: boolean;
  canDelete: boolean;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** People shown in the "Assigned to" filter. Defaults to `members`. */
  filterMembers?: Array<{ id: string; full_name: string }>;
  /** IDs of leads this user may edit; the assign menu is hidden for others. */
  editableLeadIds?: string[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const filterOptions = filterMembers ?? members;
  const editableIds = React.useMemo(
    () => (editableLeadIds ? new Set(editableLeadIds) : null),
    [editableLeadIds]
  );
  const isEditable = (lead: Lead) => !editableIds || editableIds.has(lead.id);
  const router = useRouter();
  const [page, setPage] = React.useState(0);
  const [query, setQuery] = React.useState('');
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Lead | null>(null);

  const sp = searchParams as Record<string, string | undefined>;
  const status = sp.status ?? 'all';
  const source = sp.source ?? 'all';
  const assigned = sp.assigned ?? 'all';
  const from = sp.from ?? '';
  const to = sp.to ?? '';

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    setPage(0);
    router.replace(`${basePath}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.company, l.source]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  }, [leads, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  async function handleAssign(leadId: string, userId: string | null) {
    setBusyId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to assign');
      toast.success(userId ? 'Lead assigned' : 'Lead unassigned');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign lead');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/leads/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to delete');
      toast.success('Lead deleted');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  }

  const hasFilters =
    status !== 'all' || source !== 'all' || assigned !== 'all' || from || to;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative min-w-0 sm:col-span-2 lg:col-span-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            className="pl-9"
          />
        </div>
        <div className="min-w-0">
          <Select
            value={status}
            onValueChange={(v) => updateParams({ status: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <Select value={source} onValueChange={(v) => updateParams({ source: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <Select
            value={assigned}
            onValueChange={(v) => updateParams({ assigned: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assigned to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {filterOptions.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
          <Input
            type="date"
            value={from}
            onChange={(e) => updateParams({ from: e.target.value })}
            aria-label="From date"
            className="min-w-[8.5rem] flex-1"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => updateParams({ to: e.target.value })}
            aria-label="To date"
            className="min-w-[8.5rem] flex-1"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground"
              onClick={() =>
                updateParams({ status: 'all', source: 'all', assigned: 'all', from: '', to: '' })
              }
              aria-label="Clear filters"
            >
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={<Search className="h-6 w-6" />}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpDown className="h-3 w-3" /> Name
                    </span>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Company</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned to</TableHead>
                  <TableHead className="hidden xl:table-cell">Follow-up</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((lead) => (
                  <TableRow key={lead.id} className="group">
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate font-medium text-foreground hover:text-brand-accent-dark hover:underline"
                      >
                        {lead.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.company || lead.email || lead.phone || lead.source || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {lead.company || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {lead.assigned_to_profile ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <CircleUser className="h-4 w-4 text-muted-foreground" />
                          {lead.assigned_to_profile.full_name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-sm">
                        {formatDate(lead.next_follow_up_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Actions for ${lead.name}`}
                          >
                            {busyId === lead.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="truncate text-xs font-medium text-muted-foreground">
                            {lead.name}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/leads/${lead.id}`}>View details</Link>
                          </DropdownMenuItem>
{canAssign && isEditable(lead) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">
                Assign to
              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleAssign(lead.id, null);
                                }}
                                className="text-muted-foreground"
                              >
                                Unassigned
                              </DropdownMenuItem>
                              {members.map((intern) => (
                                <DropdownMenuItem
                                  key={intern.id}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleAssign(lead.id, intern.id);
                                  }}
                                >
                                  <UserRoundCheck className="h-4 w-4" />
                                  {intern.full_name}
                                </DropdownMenuItem>
                              ))}
                            </>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setDeleteTarget(lead);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete lead
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing{' '}
              <span className="font-medium text-foreground">
                {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
                {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This permanently removes the lead and all of its activity history. This cannot be undone."
        confirmLabel="Delete lead"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}