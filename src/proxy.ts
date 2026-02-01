import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from './lib/supabase/admin';


// check if setup has been completed
  async function isSetupComplete(): Promise<boolean> {

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    
    return (users?.length ?? 0) > 0; // true if there is more than 0 users
 }
/**
 * Middleware runs on every request to:
 * 1. Refresh expired auth tokens (keeps users logged in)
 * 2. Optionally protect routes (redirect unauthenticated users)
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  
  // refresh auth token
  const { data: { user }, } = await supabase.auth.getUser();

  const setup = await isSetupComplete();
  const {pathname} = request.nextUrl;

  // Handle /setup route first
  if (pathname === "/setup") {
    if (setup) {
      // Setup complete: redirect logged-in users to home, others to login
      const redirectUrl = user ? "/" : "/login";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return supabaseResponse;
  }

  // handle /login route
  if (pathname === "/login") {
    if (!setup) {
      // setup not complete, redirect to setup endpoint
      return NextResponse.redirect(new URL("/setup", request.url))
    }
    // if user already logged in, just re route to home
    if (user) {
      return NextResponse.redirect(new URL("/", request.url ));
    }
    return supabaseResponse;
  }

  // Allow forgot-password without auth
  if (pathname === "/forgot-password") {
    if (!setup) return NextResponse.redirect(new URL("/setup", request.url));
    return supabaseResponse;
  }

  // Reset-password requires session from callback
  if (pathname === "/reset-password") {
    if (!setup) return NextResponse.redirect(new URL("/setup", request.url));
    if (!user) return NextResponse.redirect(new URL("/forgot-password", request.url));
    return supabaseResponse;
  }

  // Always allow auth callback
  if (pathname.startsWith("/api/auth/callback")) {
    return supabaseResponse;
  }

  // if setup isn't complete, always redirect to setup from anywhere
  if (!setup) {
    return NextResponse.redirect(new URL("/setup", request.url))
  }

  // protect other routes
  const protectedPaths = ["/sales", "/books"]
  const isProtectedPath = protectedPaths.some( (path) => pathname.startsWith(path) );

  // if path is protected and user isn't logged in reroute to login
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }



  return supabaseResponse;
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
