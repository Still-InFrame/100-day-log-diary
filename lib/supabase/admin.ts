import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Privileged Supabase client: it bypasses Row Level Security.
// Server-only, and used for ONE thing: the ghl_connections table, which holds
// users' HighLevel tokens and is unreachable by the browser-facing roles.
// It exists because a "Notify me" signup runs as an anonymous visitor, who
// must not be able to read the page owner's tokens, yet the server has to use
// those tokens to push the lead. Do not use it for anything RLS can do.

// Supabase's current name for this credential is the "secret key"
// (sb_secret_...); the legacy name is the service_role key. Either works.
export function hasSupabaseSecretKey(): boolean {
  return Boolean(
    process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
