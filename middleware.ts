import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DASHBOARD_PATH, type Role } from '@/lib/types';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Dashboard route → the role allowed in it. The route segment is not always the
 * role name ('/super-admin' vs the 'super_admin' role), so the pairing is
 * declared explicitly instead of derived from the path.
 */
const PROTECTED_ROUTES: Array<{ prefix: string; role: Role }> = [
  { prefix: '/super-admin', role: 'super_admin' },
  { prefix: '/admin', role: 'admin' },
  { prefix: '/intern', role: 'intern' },
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If Supabase env vars are missing at runtime (e.g. serverless deploy), don't
  // turn every route into a 500 — let /login render so the client can surface
  // a meaningful error instead.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const url = request.nextUrl.clone();
    if (url.pathname !== '/login') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value }) =>
            response.cookies.set(name, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Not signed in → public pages only are /login. Everything else redirects.
  if (!user) {
    if (pathname === '/login') return response;
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Resolve the user's role (active profile row only).
  let role: Role | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (data && (data as { is_active: boolean }).is_active) {
      role = (data as { role: Role }).role;
    }
  }

  const dashboard = role ? DASHBOARD_PATH[role] : '/login';

  const protectedRoute = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix));

  // Signed in but visiting /login or / → send to their dashboard.
  if (pathname === '/login' || pathname === '/') {
    if (!role) return response; // edge: profile missing, let them see login
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  // Role-scoped route access.
  if (protectedRoute && role !== protectedRoute.role) {
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};