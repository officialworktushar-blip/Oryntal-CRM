import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ActivityType } from '@/lib/types';
import type { Db } from '@/lib/queries';

/**
 * Logs an activity on a lead (call, email, WhatsApp, meeting, note).
 *
 * Primary path: the `log_lead_activity` RPC (atomic, RLS applies inside via
 * security invoker). If PostgREST can't resolve the function (PGRST202 — the
 * function is missing from the database or its schema cache is stale/broken),
 * we fall back to direct table writes through the client. RLS still enforces
 * the same rules: interns can only log on leads assigned to them, and
 * admins/super_admins on their permitted scope.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as {
    type?: ActivityType;
    description?: string;
    outcome?: string;
    follow_up?: string | null;
  };

  if (!body.type) {
    return NextResponse.json({ error: 'Missing activity type.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('log_lead_activity', {
    p_lead_id: params.id,
    p_type: body.type,
    p_description: body.description ?? null,
    p_outcome: body.outcome ?? null,
    p_follow_up: body.follow_up || null,
  });

  if (!error) {
    return NextResponse.json({ ok: true });
  }

  // RPC unavailable (missing function / stale PostgREST schema cache).
  if (error.message.toLowerCase().includes('schema cache')) {
    console.error(
      'log_lead_activity RPC not resolvable; using direct write fallback:',
      error.message
    );
    const fallback = await logActivityDirect(supabase, user.id, params.id, body);
    if (fallback.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: fallback.error }, { status: 400 });
  }

  const msg = error.message.toLowerCase().includes('lead not found')
    ? 'Lead not found.'
    : error.message;
  return NextResponse.json({ error: msg }, { status: 400 });
}

async function logActivityDirect(
  supabase: Db,
  userId: string,
  leadId: string,
  body: {
    type?: ActivityType;
    description?: string;
    outcome?: string;
    follow_up?: string | null;
  }
): Promise<{ ok: boolean; error: string }> {
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: 'Lead not found.' };

  const type = (body.type ?? 'note') as ActivityType;

  if (body.follow_up) {
    const { error: fuError } = await supabase
      .from('leads')
      .update({ next_follow_up_date: body.follow_up })
      .eq('id', leadId);
    if (fuError) return { ok: false, error: fuError.message };
  }

  const { error: activityError } = await supabase.from('lead_activities').insert({
    lead_id: leadId,
    user_id: userId,
    type,
    description: body.description ?? null,
    outcome: body.outcome ?? null,
  });

  if (activityError) return { ok: false, error: activityError.message };

  return { ok: true, error: '' };
}