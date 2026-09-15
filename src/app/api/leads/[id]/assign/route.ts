import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAssignLeadTo } from '@/lib/assign';
import type { Role } from '@/lib/types';

/**
 * Assigns a lead to a team member (or unassigns with null).
 * Admins/super_admins only; the assignment trigger notifies the new assignee.
 *
 * Targets: super_admin can assign to interns/admins/self;
 * admin can assign to interns or self.
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

  // Guard: enforce who may be an assignee (interns, admins, or self per role).
  if (assignedTo) {
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', assignedTo)
      .maybeSingle();
    const targetRole = (target as { role?: Role } | null)?.role;
    if (
      !targetRole ||
      !canAssignLeadTo(myRole, assignedTo, targetRole, user.id)
    ) {
      return NextResponse.json(
        { error: 'You can only assign leads to an intern (or yourself).' },
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