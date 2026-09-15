import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ActivityType } from '@/lib/types';

/**
 * Logs an activity on a lead via the atomic `log_lead_activity` RPC.
 * RLS applies inside the function:
 *   - admins/super_admins: any lead
 *   - interns: only leads assigned to them
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

  if (error) {
    const msg = error.message.includes('lead not found')
      ? 'Lead not found.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}