import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LeadStatus } from '@/lib/types';
import type { Db } from '@/lib/queries';

/**
 * Updates a lead status and records the status_change activity.
 *
 * Primary path: the `update_lead_status` RPC (atomic, RLS applies inside via
 * security invoker). If PostgREST can't resolve the function (PGRST202 — the
 * function is missing from the database or its schema cache is stale/broken),
 * we fall back to direct table writes through the client. RLS still enforces
 * the same rules: interns can only update leads assigned to them, and
 * admins/super_admins their permitted scope.
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

  const body = (await request.json()) as { status?: LeadStatus; note?: string };
  if (!body.status) {
    return NextResponse.json({ error: 'Missing status.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('update_lead_status', {
    p_lead_id: params.id,
    p_status: body.status,
    p_note: body.note ?? null,
  });

  if (!error) {
    return NextResponse.json({ ok: true });
  }

  // RPC unavailable (missing function / stale PostgREST schema cache).
  if (error.message.toLowerCase().includes('schema cache')) {
    console.error(
      'update_lead_status RPC not resolvable; using direct update fallback:',
      error.message
    );
    const fallback = await updateStatusDirect(
      supabase,
      user.id,
      params.id,
      body.status,
      body.note ?? null
    );
    if (fallback.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: fallback.error }, { status: 400 });
  }

  const msg = error.message.toLowerCase().includes('lead not found')
    ? 'Lead not found.'
    : error.message;
  return NextResponse.json({ error: msg }, { status: 400 });
}

async function updateStatusDirect(
  supabase: Db,
  userId: string,
  leadId: string,
  status: LeadStatus,
  note: string | null
): Promise<{ ok: boolean; error: string }> {
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: 'Lead not found.' };

  const { error: updateError } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (updateError) return { ok: false, error: updateError.message };

  if (lead.status !== status) {
    const { error: activityError } = await supabase.from('lead_activities').insert(
      {
        lead_id: leadId,
        user_id: userId,
        type: 'status_change',
        description: `Status changed from ${lead.status} to ${status}`,
        outcome: note,
      }
    );
    if (activityError) {
      console.error('updateStatusDirect: activity insert failed', activityError);
    }
  }

  return { ok: true, error: '' };
}