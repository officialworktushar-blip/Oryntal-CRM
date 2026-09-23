import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: unauthorized() };
  const { data: me } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  const myRole = (me as { role: Role; is_active: boolean } | null)?.role;
  if (
    !me ||
    !me.is_active ||
    (myRole !== 'super_admin' && myRole !== 'admin')
  ) {
    return { supabase, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { supabase, error: null };
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const body = await request.json();
  const {
    name,
    phone,
    email,
    company,
    platform,
    notes,
    last_connected_at,
  } = body as {
    name?: string;
    phone?: string | null;
    email?: string | null;
    company?: string | null;
    platform?: string | null;
    notes?: string | null;
    last_connected_at?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (typeof name === 'string') updates.name = name.trim();
  if (typeof phone === 'string' || phone === null) updates.phone = phone || null;
  if (typeof email === 'string' || email === null) updates.email = email || null;
  if (typeof company === 'string' || company === null) updates.company = company || null;
  if (typeof platform === 'string' || platform === null) updates.platform = platform || null;
  if (typeof notes === 'string' || notes === null) updates.notes = notes || null;
  if (typeof last_connected_at === 'string' || last_connected_at === null) {
    updates.last_connected_at = last_connected_at;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Nothing to update.' },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('outreach_contacts')
    .update(updates)
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await assertAdmin();
  if (error) return error;

  const { error: deleteError } = await supabase
    .from('outreach_contacts')
    .delete()
    .eq('id', params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}