import { Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OutreacherSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Outreacher</h2>
        <p className="text-sm text-muted-foreground">
          Manage your outreach campaigns and track engagement in one place.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No outreach campaigns yet</p>
            <p className="text-xs text-muted-foreground">
              Campaigns you create will show up here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
