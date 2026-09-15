import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProfileWithLeadCount, Role } from '@/lib/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  const myRole = (me as { role: Role; is_active: boolean } | null)?.role;
  if (!me || !me.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // RLS: interns see only their own profile row. Admins/super_admins get
  // broader results through the admin_select / super policies.
  // We expand counts on the server using the same cookie-based client.
  const { data } = await supabase
    .from('profiles')
    .select('*, leads:leads!leads_assigned_to_fkey(count)')
    .order('created_at', { ascending: false });

  const profiles = (
    (data ?? []) as Array<ProfileWithLeadCount & { leads: Array<{ count: number }> }>
  ).map((p) => ({
    ...p,
    lead_count: p.leads?.[0]?.count ?? 0,
  }));

  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  const myRole = (me as { role: Role; is_active: boolean } | null)?.role;
  if (!me || !me.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, full_name, role: targetRole } = body as {
    email: string;
    password: string;
    full_name: string;
    role?: Role;
  };

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  // super_admin can create admin/intern; admin may create interns only.
  const assignedRole: Role =
    targetRole === 'admin' && myRole === 'super_admin' ? 'admin' : 'intern';

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError) {
    const message = createError.message.includes('already')
      ? 'A user with this email already exists.'
      : createError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // The handle_new_user trigger created a default-intern profile row.
  const { error: updateError } = await admin
    .from('profiles')
    .update({ role: assignedRole, created_by: user.id })
    .eq('id', created.user.id);

  if (updateError) {
    // Roll back the auth user so we don't strand an intern-role account.
    await admin.auth.admin.deleteUser(created.user.id);
    console.error('profile update failed:', updateError);
    return NextResponse.json(
      { error: 'Account created but profile update failed: ' + updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: created.user.id });
}