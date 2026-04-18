import "server-only";
import { z } from "zod";

// Server-only env — secrets that must never reach the browser bundle.
// Importing this file from a client component will fail at build time.
const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

const emptyToUndefined = (v: string | undefined) => (v === "" ? undefined : v);

export const serverEnv = schema.parse({
  SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
  SENTRY_AUTH_TOKEN: emptyToUndefined(process.env.SENTRY_AUTH_TOKEN),
  RESEND_API_KEY: emptyToUndefined(process.env.RESEND_API_KEY),
  STRIPE_SECRET_KEY: emptyToUndefined(process.env.STRIPE_SECRET_KEY),
  STRIPE_WEBHOOK_SECRET: emptyToUndefined(process.env.STRIPE_WEBHOOK_SECRET),
});
