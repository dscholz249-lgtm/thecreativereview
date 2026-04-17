# Claude Code kickoff prompt — Creative Review

Copy the block below into Claude Code as your first message. Put `PRD.md` in the repo root first so Claude Code can reference it directly (`@PRD.md` in the prompt).

---

## The prompt

You're the lead engineer building **Creative Review**, a creative review and approval app for freelance designers and small creative teams. The full product spec lives in `@PRD.md` — read it now, in full, before writing any code. Everything below assumes you've read it.

### What matters more than anything else

**Two product invariants. Encode them in types, enforce them at the API layer, back them with a database check constraint. Don't let them degrade over the course of the build:**

1. Approvals carry no feedback. A `Decision` with `verdict = 'approve'` must have `feedback_text = null` and zero associated `Annotation` rows by that reviewer on that version. Reject at the API with 400 otherwise.
2. The annotator is only accessible from the "Request Changes" state of the review flow. Not on initial review. Not anywhere else. If you find yourself tempted to expose it earlier because it seems more convenient, stop and re-read section 7.8 of the PRD.

The whole product wedge depends on these two rules. Losing them turns Creative Review into "Filestage but worse."

### Tech stack — locked decisions, aligned with the team's existing supported stack

Do not introduce services outside this list. Every choice below is something the team already operates in production.

- **Next.js 15+** (App Router), **React**, **TypeScript** strict mode, **React Server Components by default**
- **Supabase** for everything data-layer:
  - **Supabase Auth** for both admin accounts (email + password) and client reviewers (passwordless magic link / OTP). Reviewers are real Supabase users — don't build a parallel auth system for them.
  - **Supabase Postgres** as the primary datastore
  - **Supabase Storage** for uploaded asset files (PNG, JPG, SVG, PDF). Signed URLs with short TTLs for private access.
  - **Row-Level Security policies** are the primary tenancy enforcement mechanism. Not middleware. Not manual `where` clauses. If a query works without its RLS context, you've written it wrong.
- **Tailwind CSS** + **shadcn/ui** for styling and base components. No other UI library.
- **Resend** for transactional email, with **React Email** components for templates checked into the repo.
- **Stripe Subscriptions** for billing — stub in milestone 1, wire fully in milestone 4.
- **Sentry** for error tracking, wired to both the Next.js app (client + server) and the Railway cron worker from milestone 1. Source maps uploaded in CI.
- **Amplitude** for product analytics. Instrument events per the PRD section 9 list, starting in milestone 4.
- **Railway** for hosting. Two services in one project: the Next.js app and the cron worker. Preview environments per PR.

### Build order

Ship these in sequence. Each milestone ends with something demoable. Don't start the next one until the current one is merged to main and deployed to a Railway preview.

**Milestone 1 — Foundation (target: 1 week)**
- Next.js app scaffolded with TypeScript strict mode and ESLint
- Supabase project provisioned; schema migrations authored in `supabase/migrations/*.sql` matching PRD section 8 exactly
- RLS policies written for every table as part of the initial migration — not as a follow-up
- Admin signup, login, logout via Supabase Auth (email + password, no social for v1)
- Workspace model in place; every admin's session carries a `workspace_id` claim; RLS policies key off it
- Sentry integrated (`@sentry/nextjs`), capturing errors in both server and client contexts
- Seed script (`supabase/seed.sql` or a Node script) that creates a demo workspace with 2 clients, 3 projects, 10 assets (mix of images + PDFs) for local dev
- Deployed to Railway preview with a real Supabase project (free tier is fine)
- **Definition of done:** I can sign up, log in, see my seeded data, and get a Sentry alert when I throw a test error. An integration test proves that an admin from workspace A cannot read workspace B data, even with a hand-crafted JWT.

**Milestone 2 — Admin flows (target: 1 week)**
- Client CRUD, project CRUD nested under clients
- Asset upload to Supabase Storage (private bucket, signed URL generation utility)
- Upload note field on asset version — 500 char max, plain text, server-sanitized (strip HTML, normalize whitespace)
- Admin dashboard (metrics cards + active projects table per wireframe 03)
- Asset detail page (per wireframe 04), including the version history UI and the review activity feed
- **Definition of done:** I can create a client, create a project, upload a PNG with an upload note, re-upload it as v2, and see both versions in the asset detail page.

**Milestone 3 — Client review flows (target: 1.5 weeks, the big one)**
- Supabase Auth magic link flow for reviewers — invite endpoint that generates an email via Resend with an embedded one-click sign-in URL
- Client "My reviews" inbox (wireframe 01), RLS-gated so reviewers only see assets assigned to them
- **Initial review state** (PRD 7.8.1): asset preview + admin's upload note + Approve/Request changes buttons. No annotator, no textarea. Confirmation modal on Approve.
- **Request Changes state for images** (PRD 7.8.2): unlocks the annotator, click-to-pin with percentage coordinates, numbered comments panel, local-storage-backed draft preservation, server submission on "Submit changes requested"
- **Request Changes state for non-images** (PRD 7.8.3): textarea, min 3 chars
- Decision submission endpoint with full invariant enforcement — implemented as a Server Action with Zod validation AND a Postgres check constraint
- **Definition of done:** From a magic link email, a client can approve cleanly, or request changes with pins, or request changes on a PDF with text. Every invariant violation is caught at the API layer with a meaningful error. A test asserts that you cannot sneak `feedback_text` through on an approval, even by calling the Server Action directly with crafted FormData.

**Milestone 4 — Notifications, billing, and analytics (target: 1 week)**
- Resend integration with React Email templates: new asset, decision submitted, project complete, weekly digest, manual reminder
- Railway cron service: small Node worker that runs hourly, queries reviewers whose local time is within the noon hour on Friday, enqueues digest emails via Resend
- Manual reminder button (rate-limited to 1/project/24h at the DB level, not just the UI — add a `last_reminded_at` column and check it in the Server Action)
- Stripe Subscriptions wired up for Solo/Studio/Agency tiers; webhook handler updates `Workspace.plan`
- Amplitude event instrumentation per the PRD section 9 list, gated behind a single `track()` helper that no-ops in dev
- **Definition of done:** Upload fires notification to client within 60 seconds; decision fires notification to admin immediately; the Friday digest worker fires reliably in staging for test reviewers in three different timezones; a test Stripe webhook upgrades a workspace from `solo` to `studio`.

**Milestone 5 — Beta polish**
- Landing page
- Open-source repo prep: AGPL-3.0 license, `docker compose` for self-hosting with MinIO swap-in for Supabase Storage and a local Postgres, README with deployment guide
- Onboarding tour for admins (first-run checklist)
- Accessibility pass: keyboard nav on annotator, screen reader labels on pins, focus management across review states

### Conventions

- **TypeScript strict mode**, no `any`, no `@ts-ignore` without a `// TODO` and an issue link
- **Zod** at every API boundary for request validation
- **Supabase client** is the primary query interface. Generated types via `supabase gen types typescript` checked into the repo. Never query Postgres directly bypassing RLS unless there's a documented reason (like a migration or a privileged admin operation).
- **File structure:** `app/` for routes, `lib/` for domain logic, `components/` for UI, `server/` for server-only utilities, `emails/` for React Email templates. Domain logic lives in `lib/`, not in route handlers.
- **Tests:** Vitest + Playwright. Every Server Action has at least a happy-path test and one invariant-violation test. The Approve-with-feedback case must be tested explicitly. RLS isolation must be tested with a two-workspace fixture.
- **Commits:** Conventional commits (`feat:`, `fix:`, `chore:`, etc.). One logical change per commit. Never mix formatting changes with logic changes.
- **Branch per milestone**, PRs into `main`, squash-merge.

### Anti-patterns — actively avoid

- **Don't build auth from scratch.** Supabase Auth handles both admins and reviewers. The reviewer magic-link flow is a native Supabase feature — don't reinvent it.
- **Don't bypass RLS.** Every table access from application code must go through the Supabase client with the user's JWT. Using the service role key in a route handler is a code smell; if you need it for a specific operation, isolate it in a clearly-named server utility and comment why.
- **Don't add a general-purpose "workflow engine"** to handle approvals. The flow is two states. A boolean and a verdict column cover it.
- **Don't add markup tools beyond click-to-pin.** No rectangles, no freehand, no arrows, no text highlights. This is a permanent product constraint per PRD section 12, not a v1 deferral.
- **Don't try to generalize the annotator across asset types yet.** Images only for v1. PDFs and external URLs use the text-only fallback. The generalization will be wrong because PDF and image annotation have fundamentally different coordinate systems.
- **Don't store display numbers in the database.** Compute at render time from `ORDER BY created_at ASC`.
- **Don't add services outside the stack listed above.** If a milestone feels like it needs Redis or Inngest or a new queue, stop and flag it. We will say no.

### How to behave

- If the PRD is ambiguous on a specific point, flag it and propose a default. Don't silently guess.
- If you hit an architectural decision the PRD doesn't cover (e.g., "should I use Server Actions or Route Handlers for this mutation?"), pick one, write a one-line ADR in `docs/decisions/`, and keep moving. Consistency matters more than optimality.
- If a milestone is growing past its target timeline, stop and tell me before expanding it. We cut scope, we don't stretch time.
- Don't build the landing page until milestone 5. Don't set up Amplitude events until milestone 4. Don't write a style guide until someone asks for it.

Start with milestone 1. Begin by reading `PRD.md` in full, then confirm your understanding of the two invariants above before you scaffold anything.
