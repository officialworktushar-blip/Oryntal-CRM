import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAssignLeadTo } from '@/lib/assign';
import type { Role } from '@/lib/types';

export async function POST(request: Request) {
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

  const body = await request.json();
  const {
    name,
    phone,
    email,
    company,
    source,
    status = 'new',
    priority = 'medium',
    notes,
    assigned_to = null,
    next_follow_up_date = null,
  } = body as {
    name?: string;
    phone?: string | null;
    email?: string | null;
    company?: string | null;
    source?: string | null;
    status?: string;
    priority?: string;
    notes?: string | null;
    assigned_to?: string | null;
    next_follow_up_date?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Lead name is required.' }, { status: 400 });
  }

  // Enforce the same assignment rules as reassignment.
  if (assigned_to) {
    const { data: target } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', assigned_to)
      .maybeSingle();
    const targetRole = (target as { role?: Role } | null)?.role;
    if (
      !targetRole ||
      !canAssignLeadTo(myRole, assigned_to, targetRole, user.id)
    ) {
      return NextResponse.json(
        { error: 'You can only assign leads to an intern (or yourself).' },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      company: company || null,
      source: source || null,
      status,
      priority,
      notes: notes || null,
      assigned_to: assigned_to || null,
      next_follow_up_date: next_follow_up_date || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}