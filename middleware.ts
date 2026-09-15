import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PROTECTED_ROUTES = ['/super-admin', '/admin', '/intern'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
  let role: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (data && (data as { is_active: boolean }).is_active) {
      role = (data as { role: string }).role;
    }
  }

  const isProtected = PROTECTED_ROUTES.some((r) =>
    pathname.startsWith(r)
  );

  // Signed in but visiting /login or / → send to their dashboard.
  if (pathname === '/login' || pathname === '/') {
    if (!role) return response; // edge: profile missing, let them see login
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  // Role-scoped route access.
  if (isProtected) {
    const routeOwner = PROTECTED_ROUTES.find((r) =>
      pathname.startsWith(r)
    )!;
    const expectedRole = routeOwner.slice(1); // '/admin' → 'admin'
    if (role !== expectedRole) {
      const target = role ? `/${role}` : '/login';
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};