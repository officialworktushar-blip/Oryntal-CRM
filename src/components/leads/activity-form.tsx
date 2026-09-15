'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
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
import { ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import type { ActivityType } from '@/lib/types';

const TYPES = Object.keys(ACTIVITY_TYPE_LABELS).filter(
  (t) => t !== 'status_change'
) as ActivityType[];

export function ActivityForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [type, setType] = React.useState<ActivityType>('call');
  const [description, setDescription] = React.useState('');
  const [outcome, setOutcome] = React.useState('');
  const [followUp, setFollowUp] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description: description.trim(),
          outcome: outcome.trim(),
          follow_up: followUp || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to log activity');
      toast.success('Activity logged');
      setDescription('');
      setOutcome('');
      setFollowUp('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log activity');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Type
        </Label>
        <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ACTIVITY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activity-desc">Description</Label>
        <Textarea
          id="activity-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={describePlaceholder(type)}
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activity-outcome">Outcome</Label>
        <Input
          id="activity-outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g. Interested in chatbot automation"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="activity-followup">Set next follow-up date</Label>
        <Input
          id="activity-followup"
          type="date"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
        />
      </div>

      <Button type="submit" variant="gold" disabled={busy} className="w-full">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Logging…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Log activity
          </>
        )}
      </Button>
      {followUp && (
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <CalendarPlus className="h-3.5 w-3.5" />
          Follow-up set for {formatShortDate(followUp)}
        </p>
      )}
    </form>
  );
}

function describePlaceholder(type: ActivityType): string {
  switch (type) {
    case 'call':
      return 'What was discussed on the call?';
    case 'email':
      return 'What was sent / received?';
    case 'whatsapp':
      return 'What was discussed on WhatsApp?';
    case 'meeting':
      return 'Meeting notes';
    default:
      return 'Add a note…';
  }
}

function formatShortDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}