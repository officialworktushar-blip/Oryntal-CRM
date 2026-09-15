import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Only usable in Server Components / Route Handlers
 * (the `server-only` import enforces this at build time). Never expose the
 * service role key to the browser — `.env.example` documents it as a
 * server-only variable.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}