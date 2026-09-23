import { Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddOutreachContactDialog } from '@/components/outreach/outreach-contact-dialog';
import { OutreachContactsTable } from '@/components/outreach/outreach-contacts-table';
import { fetchOutreachContacts } from '@/lib/queries';
import type { Db } from '@/lib/queries';

export async function OutreacherSection({ supabase }: { supabase: Db }) {
  const contacts = await fetchOutreachContacts(supabase);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold">Outreacher</h2>
          <p className="text-sm text-muted-foreground">
            Track people you reach out to and when you last connected with them.
          </p>
        </div>
        <AddOutreachContactDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
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