# Milestone 4 — UAT checklist

Run against the live Railway deploy after main is green.

## Prereqs (one-time, before running the checks below)

- [x] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` set on the Railway web service
- [ ] `AMPLITUDE_API_KEY` set on the Railway web service AND the cron service
- [x] `RESEND_API_KEY` + `EMAIL_FROM` set (EMAIL_FROM must be on a domain verified in Resend or left unset to use Resend's sandbox sender)
- [x] Supabase migration `20260420120000_milestone4_billing.sql` applied (check `workspaces.stripe_customer_id` exists)
- [x] Stripe webhook endpoint configured in Stripe Dashboard → Developers → Webhooks, pointing at `https://<prod-host>/api/stripe/webhook`, listening to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- [x] Stripe Price IDs resolve correctly. Defaults in `lib/stripe/config.ts` are **test mode**. For live mode, set `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_STUDIO`, `STRIPE_PRICE_AGENCY` on Railway (and point `STRIPE_SECRET_KEY` at `sk_live_...`). No code change needed to switch modes.
- [x] Railway cron service for the digest worker: image `Dockerfile.worker`, schedule `0 * * * *`, start command `npm run worker:digest`

## 1. Notifications — new asset upload → reviewer email

- [x] Sign in as an admin with at least one client that has one reviewer invited
- [x] Upload a new PNG asset to a project in that client
- [x] Within ~60s, the reviewer's inbox receives a "New in {Project}: {Asset} is ready for review" email
- [x] The upload note (if one was entered) appears in the email as a blockquote
- [x] "Review now" button in the email opens `/review/assets/{id}` and the reviewer can sign in
- [x] Upload a **v2** of the same asset → a second email arrives (no dedup suppression)

## 2. Notifications — decision submitted → admin email

- [x] As a reviewer, **approve** an asset from the initial-review state
- [x] Admin receives "{Reviewer} approved {Asset}" email immediately
- [x] As a reviewer, open a different image and choose **Request changes** → add 2+ pins + text feedback → Submit
- [x] Admin receives "{Reviewer} requested changes on {Asset}" email, with pin count + feedback body rendered
- [x] Reject on a PDF / non-image: textarea-only submission also triggers the admin email

## 3. Notifications — project completed → admin email

- [x] In a project with exactly one non-archived pending asset, approve that asset as a reviewer
- [x] Admin receives "{Project} is complete" email with the correct approved-count
- [x] Re-approving (or re-deciding via different version) does NOT send a duplicate project-completed email (idempotency via `notifications.kind='project_completed'` check)

## 4. Manual reminder — DB-level 24h rate limit

- [x] On a project detail page with pending assets, click **Nudge reviewers**
- [x] Button goes disabled + "Reminder on cooldown" appears; all reviewers receive the `manual-reminder` email listing pending items
- [x] Reload the page — button stays disabled (state is pulled from `projects.last_reminded_at`)
- [x] **Attempt the bypass**: in DevTools, re-enable the disabled button and click Send. The action must return "This project was reminded within the last 24 hours." — this verifies the enforcement is in the DB, not the UI.
- [x] In Supabase SQL editor: `update projects set last_reminded_at = now() - interval '25 hours' where id = '97f01f4a-4159-44fd-9e37-deb9423b8af1';` → button re-enables + send succeeds.

## 5. Stripe — initial subscription (Solo)

- [ ] Sign int as a new admin (workspace should show plan `Self-hosted`)
- [ ] Navigate via workspace dropdown → **Billing**
- [ ] Click **Subscribe to Solo**
- [ ] Checkout opens in Stripe-hosted page; use test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP
- [ ] Return URL lands on `/billing?checkout=success` with a green banner
- [ ] Within a few seconds (webhook latency), the **Current plan** card flips to `Solo / paid`
- [ ] Supabase: `workspaces.plan = 'solo'`, `stripe_customer_id` and `stripe_subscription_id` both populated

## 6. Stripe — plan change (Solo → Studio) via webhook

- [ ] From billing page, click **Manage in Stripe** → Portal opens
- [ ] In Portal: Update plan → Studio → confirm
- [ ] Back on `/billing`, within a few seconds the Current plan shows `Studio / paid`
- [ ] Supabase: `workspaces.plan = 'studio'` (same row, no new workspace created)
- [ ] **Alt path (no UI involved)**: trigger `stripe trigger customer.subscription.updated --override ...` from the Stripe CLI with the `stripe_subscription_id` of the test workspace and a new `price_id` → plan flips

## 7. Stripe — cancellation

- [ ] In Stripe Portal, cancel the subscription (immediate, not end-of-period)
- [ ] Webhook `customer.subscription.deleted` fires
- [ ] Supabase: `workspaces.plan = 'oss'`, `stripe_subscription_id = null`, `stripe_customer_id` retained (so next subscribe reuses it)

## 8. Weekly digest cron worker

- [ ] Railway cron logs show the hourly tick lines (`[digest] tick @ <iso>`)
- [ ] **Dry run**: as service-role in Supabase, insert a dummy `client_reviewers` row with `timezone = <a timezone currently at Fri 12:xx>`. On the next hourly tick, the worker should log `candidates=1 sent=1` and insert a `notifications` row with `kind='weekly_digest'`
- [ ] Run a second time within 20 hours → the worker skips (`candidates=1 sent=0`)
- [ ] With `AMPLITUDE_API_KEY` set, an Amplitude event `digest_sent` shows up in the live project

## 9. Analytics — PRD §9 event list

Spot-check in Amplitude (production) that these events fire from real user actions:

- [ ] `signup` — admin creates a new workspace
- [ ] `client_created` — admin creates a client
- [ ] `asset_uploaded` — admin uploads a new asset (fires from notifyNewAssetUploadedFromVersion, includes `recipient_count`)
- [ ] `decision_submitted` — reviewer approves or rejects
- [ ] `annotation_created` — reject with at least one pin (fires once per submission, with count)
- [ ] `feedback_submitted` — reject with non-empty textarea
- [ ] `project_completed` — final approve in a project
- [ ] `reminder_sent` — admin clicks Nudge
- [ ] `magic_link_opened` — reviewer opens their invite email link
- [ ] `digest_sent` — from the cron worker

## 10. Invariants still hold (regression check)

- [ ] Approve flow still shows **no** annotator, **no** feedback textarea
- [ ] In DevTools, attempt `fetch('/review/...', { method: 'POST', body: formData-with-feedback-on-approve })` → server returns 400-ish error, DB unchanged
- [ ] Annotator remains hidden on the initial review state (only unlocks after "Request changes")
- [ ] PDF and external-URL assets do NOT show pins; they show the textarea fallback only

## 11. Regression — milestones 1–3 smoke

- [ ] Sign up, log in, log out still work
- [ ] Client + project CRUD unaffected
- [ ] Version history on asset detail page still works + `?v=N` version switcher
- [ ] Admin activity feed shows newest decisions
- [ ] RLS still isolates workspace A from workspace B (integration test should still be green)

## 12. Sentry

- [ ] `/sentry-test` still throws and the error lands in the Sentry project for prod environment
- [ ] A deliberately-bad webhook signature (curl with wrong body) does not 500 → returns 400, no Sentry noise
