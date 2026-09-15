import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { MyWorkSection } from '@/components/leads/my-work-section';

export const metadata: Metadata = { title: 'Intern' };

async function getGreeting(): Promise<string> {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function InternPage() {
  const session = await requireRole(['intern']);
  const { profile } = session;

  const firstName = profile.full_name.split(' ')[0] || 'there';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${await getGreeting()}, ${firstName}`}
        description={formatDate(new Date().toISOString())}
      />
      <MyWorkSection session={session} />
    </div>
  );
}