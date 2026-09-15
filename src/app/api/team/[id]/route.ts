import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const targetId = params.id;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (targetId === user.id && ('is_active' in body || 'role' in body)) {
    return NextResponse.json(
      { error: 'You cannot change your own role or active status.' },
      { status: 400 }
    );
  }

  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  if (body.role && myRole === 'super_admin') updates.role = body.role as Role;
  if (body.full_name !== undefined) updates.full_name = body.full_name;
  if (body.phone !== undefined) updates.phone = body.phone;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields.' }, { status: 400 });
  }

  if (myRole === 'admin' && updates.role && updates.role !== 'intern') {
    return NextResponse.json(
      { error: 'Admins can only manage intern accounts.' },
      { status: 403 }
    );
  }

  // Cookie-based client (anon key) — RLS enforces:
  //   super_admin_all  →  full access
  //   admin_update     →  intern rows only, no role escalation
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}