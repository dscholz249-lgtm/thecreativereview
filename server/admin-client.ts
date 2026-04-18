import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

// Service-role Supabase client — BYPASSES RLS. Use only when a legitimate
// privileged operation cannot be expressed under RLS. Every call site must be
// named and documented.
//
// Known legitimate call sites:
//   * bootstrapWorkspaceForNewUser (signup): creates a workspace + admin_profile
//     before any admin_profile row exists, so RLS can't express the policy.
//   * (milestone 4) Stripe webhook: user is not authenticated.
//   * (milestone 4) Railway cron worker: no user JWT.
//   * (scripts only) seed.ts: local development only.
//
// Do not import this from route handlers or components.
export function createAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
