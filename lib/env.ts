import { z } from "zod";

// Universal env — only NEXT_PUBLIC_* vars, safe for both client and server.
// For server-only secrets (service role key, Sentry auth token), import from
// `lib/env.server.ts` instead.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

// Coerce "" → undefined so `.default()` and `.optional()` kick in when a
// Dockerfile ENV is set to an empty string (e.g. a build ARG was not passed
// through). Without this, Zod sees "" and fails `.url()` validation.
const emptyToUndefined = (v: string | undefined) => (v === "" ? undefined : v);

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: emptyToUndefined(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: emptyToUndefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  NEXT_PUBLIC_APP_URL: emptyToUndefined(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_SENTRY_DSN: emptyToUndefined(process.env.NEXT_PUBLIC_SENTRY_DSN),
};

export const env = schema.parse(raw);
