import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ImportLeadRow, Role } from '@/lib/types';

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

  const { rows } = (await request.json()) as { rows?: ImportLeadRow[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided.' }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: 'Maximum 500 rows per import.' }, { status: 400 });
  }

  const insertRows = rows.map((r) => ({
    name: (r.name ?? '').trim() || 'Untitled',
    phone: r.phone ?? null,
    email: r.email ?? null,
    company: r.company ?? null,
    source: r.source ?? null,
    status: 'new' as const,
    priority: 'medium',
    assigned_to: null,
    created_by: user.id,
  }));

  const { data, error } = await supabase
    .from('leads')
    .insert(insertRows)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, imported: data?.length ?? 0 });
}