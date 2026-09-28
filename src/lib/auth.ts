import 'server-only';

import { redirect } from 'next/navigation';
import { DASHBOARD_PATH } from '@/lib/types';
import type { Profile, Role } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export interface AuthSession {
  user: { id: string; email?: string | null };
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Returns the signed-in user + their active profile, or null.
 * RLS ensures a user can only ever read their own profile row here
 * (interns: own row; admins/super admins: broader read via admin policies).
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const typedProfile = profile as Profile | null;

  if (!typedProfile || !typedProfile.is_active) return null;

  return {
    user: { id: user.id, email: user.email },
    profile: typedProfile,
    supabase,
  };
}

/**
 * Server-side guard for dashboard routes. Redirects to /login when the user
 * is not authenticated and to the role-appropriate dashboard when they lack
 * access to the current route. DASHBOARD_PATH maps the stored role onto its
 * route — 'super_admin' lives at '/super-admin', not '/super_admin'.
 */
export async function requireRole(roles: Role[]) {
  const session = await getAuthSession();
  if (!session) redirect('/login');

  if (!roles.includes(session.profile.role)) {
    redirect(DASHBOARD_PATH[session.profile.role] ?? '/login');
  }

  return session;
}