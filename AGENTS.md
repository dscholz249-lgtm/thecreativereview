<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key Next.js 16 gotchas:
- `cookies()`, `headers()`, `params`, `searchParams` are all **async** — must be awaited.
- Middleware is now `proxy.ts` at the root with `export default async function proxy(req: NextRequest)`.
- `Route Handlers` take a `RouteContext<'/path/[id]'>` context helper for typed params (also a Promise).
- Server Actions are unchanged structurally (`"use server"`, `useActionState`).
<!-- END:nextjs-agent-rules -->

# Creative Review — project conventions

## Non-negotiables

1. **Decision invariants** (`docs/decisions/0001-enforce-invariants-at-three-layers.md`):
   approve carries no feedback + no annotations; reject needs feedback ≥ 3 chars
   or ≥ 1 annotation. Enforced at types + API + DB. Never bypass any layer.
2. **The annotator is only accessible in the Request Changes state** of the
   review flow. Not on initial review. Not anywhere else.
3. **RLS is the primary tenancy mechanism.** Every table access in application
   code must go through the authenticated Supabase client (`lib/supabase/server.ts`
   or `lib/supabase/client.ts`). The service role client (`server/admin-client.ts`)
   is reserved for signup bootstrap, the cron worker, the Stripe webhook, and
   local seed scripts — and every such call site is documented in that file.

## File structure

- `app/` — Next.js routes. Route groups `(auth)` (unauthenticated) and `(app)`
  (authenticated) keep layouts separate.
- `components/` — Reusable UI components.
- `lib/` — Domain logic, Zod schemas, Supabase clients, utilities. Pure modules.
- `server/` — Server-only modules (`import "server-only"` at the top).
- `emails/` — React Email templates (milestone 4).
- `scripts/` — Ops scripts (`tsx scripts/*.ts`).
- `supabase/` — Migrations (`migrations/*.sql`), local CLI config.
- `tests/` — `unit/`, `integration/` (needs local Supabase), `e2e/` (Playwright).
- `docs/decisions/` — ADRs. Add one whenever you make a decision the PRD
  doesn't answer.

## Conventions

- **No `any`, no `@ts-ignore`** without a `TODO` and an issue link.
- **Zod at every API boundary** (Server Actions, Route Handlers).
- **Conventional commits.** One logical change per commit. Never mix formatting
  with logic.
- **`import "server-only"`** at the top of any module that must not reach the
  browser bundle.
- **Tests** — every Server Action has at least a happy-path test and one
  invariant-violation test. The approve-with-feedback case must be tested
  explicitly.
- **Don't store display numbers in the DB** — compute at render from
  `ORDER BY created_at ASC`.
