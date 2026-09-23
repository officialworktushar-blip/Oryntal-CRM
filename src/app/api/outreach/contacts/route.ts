import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  if (
    !me ||
    !me.is_active ||
    (myRole !== 'super_admin' && myRole !== 'admin')
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('outreach_contacts')
    .insert({
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      company: company || null,
      platform: platform || null,
      notes: notes || null,
      last_connected_at: last_connected_at || null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}