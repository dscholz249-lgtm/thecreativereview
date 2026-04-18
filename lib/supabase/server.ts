import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

// Server-side Supabase client for RSC, Server Actions, and Route Handlers.
// The caller's JWT flows via cookies, so every query is subject to RLS.
// Never use the service role key here — use server/admin-client.ts for that.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from a Server Component — session refresh will
            // retry on the next request. Safe to ignore.
          }
        },
      },
    },
  );
}
