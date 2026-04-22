import dotenv from "dotenv";

// Load .env first (if present), then .env.local with override so local
// dev creds take precedence. Vitest runs before any `next` boot, so Next's
// own env loader doesn't run here — we load explicitly.
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// Integration tests expect a locally-running Supabase. Start it via:
//   supabase start
// and copy the service role key / URL it prints into .env.local.
