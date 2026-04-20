# 0002 — Cron worker on Railway, not Inngest / queue

**Status:** accepted  
**Date:** 2026-04-20

## Context

Milestone 4 needs a Friday-noon weekly digest email for each reviewer in
their own timezone. The cadence is hourly-at-minute-0; the payload is
small (a few hundred rows at most per tick for a small beta).

The PRD locks the stack to services the team already runs: Next.js,
Supabase, Resend, Stripe, Sentry, Amplitude, Railway. It explicitly
excludes Redis, Inngest, and new queues.

## Decision

One hourly cron job on Railway, one container image
(`Dockerfile.worker`), one entrypoint (`workers/digest.ts` invoked via
`npm run worker:digest`). No queue. Each run is a one-shot process that
scans reviewers, filters to those currently in the Friday-noon window
in their timezone, and sends each digest inline.

Guardrails:

* Idempotency via the `notifications` table — skip if a `weekly_digest`
  row was already created for this recipient in the last 20 hours.
* Timezone filter in-app via `Intl.DateTimeFormat` — no DB-side cron
  fan-out, so re-running the job is safe.
* Worker uses the service-role Supabase client; it has no user JWT and
  is documented in `server/admin-client.ts` as a sanctioned call site.

## Consequences

* Fits the hourly/small-payload cadence — a queue would be premature.
* Operationally simple: if a tick fails, Railway surfaces a non-zero
  exit, Sentry alerts, the next tick recovers. No DLQ bookkeeping.
* If reviewer count grows past ~5k, the full-scan query becomes the
  wrong shape and we'll switch to bucketed fan-out by timezone. Until
  then: one query per tick is fine.
