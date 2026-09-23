'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
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
import { OUTREACH_PLATFORMS } from '@/lib/constants';
import type { OutreachContact } from '@/lib/types';
import { cn } from '@/lib/utils';

const inputClass = 'border-input bg-white focus-visible:ring-brand-accent/50';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  company: '',
  platform: '',
  last_connected_at: '',
  notes: '',
};

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function OutreachContactForm({
  contact,
  onDone,
}: {
  contact?: OutreachContact | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(
    contact
      ? {
          name: contact.name,
          phone: contact.phone ?? '',
          email: contact.email ?? '',
          company: contact.company ?? '',
          platform: contact.platform ?? '',
          last_connected_at: toLocalInputValue(contact.last_connected_at),
          notes: contact.notes ?? '',
        }
      : EMPTY_FORM
  );

  const isEdit = !!contact;
  const canSubmit = form.name.trim().length > 0;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/outreach/contacts/${contact.id}` : '/api/outreach/contacts',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email,
            company: form.company,
            platform: form.platform,
            notes: form.notes,
            last_connected_at: form.last_connected_at
              ? new Date(form.last_connected_at).toISOString()
              : null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save contact');
      toast.success(isEdit ? 'Contact updated' : 'Contact added');
      onDone();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">Name *</Label>
        <Input
          id="contact-name"
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Aarav Sharma"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+91 98765 43210"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="aaron@company.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-company">Company</Label>
          <Input
            id="contact-company"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
            placeholder="Acme Corp"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-platform">Platform</Label>
          <Select
            value={form.platform}
            onValueChange={(v) => set('platform', v)}
          >
            <SelectTrigger id="contact-platform" className={inputClass}>
              <SelectValue placeholder="How you reached out…" />
            </SelectTrigger>
            <SelectContent>
              {OUTREACH_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-last-connected">Last connected</Label>
        <Input
          id="contact-last-connected"
          type="datetime-local"
          value={form.last_connected_at}
          onChange={(e) => set('last_connected_at', e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          When you last spoke with or contacted this person.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-notes">Notes</Label>
        <Textarea
          id="contact-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Context about this contact (optional)"
          className={cn(inputClass, 'min-h-[80px]')}
        />
      </div>

      <DialogFooter>
        <Button
          type="submit"
          variant="gold"
          disabled={!canSubmit || saving}
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Add contact'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddOutreachContactDialog({
  variant = 'gold',
  className,
}: {
  variant?: 'default' | 'outline' | 'gold';
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add an outreach contact</DialogTitle>
          <DialogDescription>
            Save the person&apos;s details and the last time you connected with
            them.
          </DialogDescription>
        </DialogHeader>
        <OutreachContactForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditOutreachContactDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: OutreachContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!contact) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
          <DialogDescription>
            Update the contact&apos;s details or when you last connected.
          </DialogDescription>
        </DialogHeader>
        <OutreachContactForm
          contact={contact}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}