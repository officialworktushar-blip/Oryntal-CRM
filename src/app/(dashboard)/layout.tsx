import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { DashboardShell } from '@/components/shell/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session) redirect('/login');

  const { profile } = session;

  return (
    <DashboardShell
      user={{
        name: profile.full_name || 'User',
        email: profile.email,
        role: profile.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}