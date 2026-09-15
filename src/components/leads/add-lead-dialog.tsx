'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LEAD_SOURCES, PRIORITY_ORDER } from '@/lib/constants';
import { cn } from '@/lib/utils';

const inputClass =
  'border-input bg-white focus-visible:ring-brand-accent/50';

export function AddLeadDialog({
  members,
  variant = 'outline',
  className,
}: {
  members: Array<{ id: string; full_name: string }>;
  variant?: 'default' | 'outline' | 'gold';
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    source: '',
    priority: 'medium',
    assigned_to: '',
    notes: '',
  });

  const canSubmit = form.name.trim().length > 0;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          company: form.company,
          source: form.source,
          priority: form.priority,
          assigned_to: form.assigned_to || null,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create lead');
      toast.success('Lead created');
      setOpen(false);
      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        source: '',
        priority: 'medium',
        assigned_to: '',
        notes: '',
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a new lead</DialogTitle>
          <DialogDescription>
            Create a lead — keep it for yourself, or hand it to a team member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Name *</Label>
            <Input
              id="lead-name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="aaron@company.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-company">Company</Label>
              <Input
                id="lead-company"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Acme Corp"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-source">Source</Label>
              <Select value={form.source} onValueChange={(v) => set('source', v)}>
                <SelectTrigger id="lead-source" className={inputClass}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-priority">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => set('priority', v)}
              >
                <SelectTrigger id="lead-priority" className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-assign">Assign to</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(v) => set('assigned_to', v)}
            >
              <SelectTrigger id="lead-assign" className={inputClass}>
                <SelectValue placeholder="Leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-3.5 w-3.5" /> Unassigned
                  </span>
                </SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-notes" className={cn('flex items-center gap-1')}>
              Notes
            </Label>
            <Textarea
              id="lead-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Context about this lead (optional)"
              className={cn(inputClass, 'min-h-[80px]')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={!canSubmit || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Create lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}