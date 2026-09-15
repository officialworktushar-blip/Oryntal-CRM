import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

/**
 * Assigns a lead to an intern (or unassigns with null).
 * Admins/super_admins only; the assignment trigger notifies the new assignee.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: me } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  const myRole = (me as { role: Role; is_active: boolean } | null)?.role;
  if (!me || !me.is_active || (myRole !== 'super_admin' && myRole !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as { user_id?: string | null };
  const assignedTo = body.user_id ?? null;

  // Guard: only interns (or null) may be assignees.
  if (assignedTo) {
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', assignedTo)
      .maybeSingle();
    const targetRole = (target as { role?: Role } | null)?.role;
    if (!targetRole || targetRole !== 'intern') {
      return NextResponse.json(
        { error: 'Leads can only be assigned to interns.' },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: assignedTo })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}