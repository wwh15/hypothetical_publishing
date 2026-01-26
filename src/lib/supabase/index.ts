// Re-export for clean imports
// Usage: import { createClient } from "@/lib/supabase"

export { createClient } from "./client";
export { createClient as createServerClient } from "./server";
export { supabaseAdmin } from "./admin";
export * from "./auth";
export * from "./storage";
