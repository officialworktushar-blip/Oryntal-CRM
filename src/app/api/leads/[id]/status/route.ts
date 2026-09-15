import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LeadStatus } from '@/lib/types';

/**
 * Updates a lead status and records the status_change activity in one
 * transaction via the `update_lead_status` RPC. RLS applies inside the
 * function (security invoker), so:
 *   - admins/super_admins can change any lead
 *   - interns can change only leads assigned to them
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  if (error) {
    const msg = error.message.includes('lead not found')
      ? 'Lead not found.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}