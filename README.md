# Creative Review

A lightweight creative review and approval app for freelance designers and
small creative teams. Built on two opinionated product rules: **every asset
gets a clean thumbs up or thumbs down**, and **approvals cannot carry
feedback** — if a client wants to leave notes, they must formally request
changes.

See [`docs/PRD.md`](docs/PRD.md) for the full product spec and
[`docs/decisions/`](docs/decisions/) for architectural decisions.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript strict**
- **Supabase** — Postgres, Auth, Storage, Row-Level Security
- **Tailwind CSS v4** · **shadcn/ui** (added per-component)
- **Resend** + **React Email** (milestone 4)
- **Stripe Subscriptions** (milestone 4)
- **Sentry** — errors · **Amplitude** — product analytics (milestone 4)
- **Railway** — hosting (Next.js app + cron worker)

## Local development

### First-time setup

```sh
# 1. Install deps
npm install

# 2. Copy env template and fill in credentials
cp .env.example .env.local

# 3. Start local Supabase (requires Docker)
npm run db:start

# 4. Apply migrations + seed demo data
npm run db:reset

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000 and log in with the seed credentials printed by
`npm run db:seed`.

### Common scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with Turbopack |
| `npm run build` | Production build (standalone output) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:integration` | Vitest integration tests (needs local Supabase) |
| `npm run db:reset` | Resets local DB, re-applies migrations, re-seeds |
| `npm run db:types` | Regenerates `lib/database.types.ts` from local DB |

### Running against a hosted Supabase

If you'd rather develop against a real Supabase project (no Docker), fill
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` with your project's credentials,
then:

```sh
supabase link --project-ref <project-ref>
supabase db push         # pushes migrations to the remote project
npm run db:seed          # seeds demo data
```

## Deployment — Railway

Railway auto-builds from the repo's `Dockerfile`. Two services share one
project:

- **`thecreativereview`** — the Next.js app (this repo's root)
- **`cron`** — the Railway cron worker (added in milestone 4)

Set these env vars in Railway (Settings → Variables):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (the deployed URL)
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
  `SENTRY_PROJECT`
- (milestone 4) `RESEND_API_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`

Preview environments are enabled per-PR via Railway's preview-env setting.

## Product invariants

These two rules are non-negotiable and enforced at three layers (types + API
+ DB). See
[`docs/decisions/0001-enforce-invariants-at-three-layers.md`](docs/decisions/0001-enforce-invariants-at-three-layers.md)
for details.

1. **Approve has no feedback.** A `Decision` with `verdict = 'approve'` must
   have `feedback_text IS NULL` and zero `Annotation` rows for
   `(reviewer_id, asset_version_id)`.
2. **Annotator only in Request Changes.** The annotator UI is not rendered
   on the initial review state — it's a separate route, not a toggle.

Breaking either invariant breaks the product. Don't.

## Repository layout

```
app/               Next.js routes (App Router)
  (auth)/          Login, signup, logout
  (app)/           Authenticated shell
  auth/callback/   Supabase email / magic-link callback
components/        Reusable UI components
docs/              PRD, design SVGs, ADRs
  decisions/       Architectural decision records
emails/            React Email templates (milestone 4)
lib/               Domain logic, types, utilities, Supabase clients
scripts/           Ops scripts (seed, etc.)
server/            Server-only modules (service-role client, etc.)
supabase/          CLI config, migrations
tests/
  unit/            Vitest unit tests
  integration/     Vitest integration tests (need local Supabase)
  e2e/             Playwright end-to-end tests (milestone 3+)
proxy.ts           Next 16 proxy (session refresh)
```

## License

AGPL-3.0 on public release (milestone 5). Not yet licensed.
