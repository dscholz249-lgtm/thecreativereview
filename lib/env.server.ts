import "server-only";
import { z } from "zod";

// Server-only env — secrets that must never reach the browser bundle.
// Importing this file from a client component will fail at build time.
//
// Validation is LAZY (deferred to first property access via Proxy). Reason:
// Next.js's "Collecting page data" step at build time transitively imports
// any module referenced by a server component / layout / route handler, even
// if the code path that needs the secret never actually runs at build. We
// don't want the build to require runtime secrets like the service role key.
// Accessing a property (e.g. `serverEnv.SUPABASE_SERVICE_ROLE_KEY`) is what
// triggers parsing, at which point we're running on a real request.

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  // Falls back to Resend's sandbox sender if unset. For real delivery,
  // set this to an address on a domain verified in your Resend account,
  // e.g. "Creative Review <no-reply@yourdomain.com>".
  EMAIL_FROM: z.string().default("Creative Review <onboarding@resend.dev>"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  AMPLITUDE_API_KEY: z.string().optional(),
});

type ServerEnv = z.infer<typeof schema>;

const emptyToUndefined = (v: string | undefined) => (v === "" ? undefined : v);

let cached: ServerEnv | null = null;

function load(): ServerEnv {
  if (cached) return cached;
  cached = schema.parse({
    SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SENTRY_AUTH_TOKEN: emptyToUndefined(process.env.SENTRY_AUTH_TOKEN),
    RESEND_API_KEY: emptyToUndefined(process.env.RESEND_API_KEY),
    EMAIL_FROM: emptyToUndefined(process.env.EMAIL_FROM),
    STRIPE_SECRET_KEY: emptyToUndefined(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: emptyToUndefined(process.env.STRIPE_WEBHOOK_SECRET),
    AMPLITUDE_API_KEY: emptyToUndefined(process.env.AMPLITUDE_API_KEY),
  });
  return cached;
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return load()[prop as keyof ServerEnv];
  },
});
