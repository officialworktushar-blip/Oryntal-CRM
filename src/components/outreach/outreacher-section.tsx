import { Megaphone, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddOutreachContactDialog } from '@/components/outreach/outreach-contact-dialog';
import { OutreachContactsTable } from '@/components/outreach/outreach-contacts-table';
import { fetchOutreachContacts } from '@/lib/queries';
import type { Db } from '@/lib/queries';
import type { OutreachContact } from '@/lib/types';

export async function OutreacherSection({ supabase }: { supabase: Db }) {
  let contacts: OutreachContact[] = [];
  let loadError: string | null = null;

  try {
    contacts = await fetchOutreachContacts(supabase);
  } catch (e) {
    contacts = [];
    loadError = e instanceof Error ? e.message : 'Could not load outreach contacts.';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Outreacher</h2>
          <p className="text-sm text-muted-foreground">
            Track people you reach out to and when you last connected with them.
          </p>
        </div>
        <AddOutreachContactDialog disabled={Boolean(loadError)} />
      </div>

      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-medium text-red-900">Outreacher is unavailable</p>
            <p className="mt-0.5 text-red-800/80">{loadError}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError ? null : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Megaphone className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No outreach contacts yet</p>
              <p className="text-xs text-muted-foreground">
                Add a contact to start tracking your outreach.
              </p>
            </div>
          ) : (
            <OutreachContactsTable contacts={contacts} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}