import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Client Components ('use client')
 *
 * Use for:
 * - Auth UI (login/logout/signup)
 * - Real-time subscriptions
 * - Storage uploads from browser
 *
 * RLS policies apply based on user session
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
