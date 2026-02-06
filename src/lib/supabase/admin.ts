import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client that bypasses Row Level Security
 *
 * IMPORTANT: Only use server-side, never expose to client
 *
 * Use for:
 * - Admin operations that need full DB access
 * - Background jobs / cron tasks
 * - Operations on behalf of system (not a specific user)
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
