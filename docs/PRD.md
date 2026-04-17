# PRD — Creative Review

**Owner:** Labs team
**Status:** Draft v1
**Target audience:** Freelance designers and small creative teams (1–10 admins), and their clients (unlimited reviewers).
**Last updated:** April 2026

---

## 1. Executive summary

A lightweight creative review platform built on two opinionated product rules: **(1) every asset gets a clean thumbs up or thumbs down, and (2) approvals cannot carry feedback**. If a client wants to leave notes, they must formally request changes. When they request changes on an image, a click-to-pin annotator unlocks so they can point at what they mean and comment per pin. When they approve, they approve the asset exactly as delivered — no conditional approvals, no "looks good, but…". Admins can attach a note to an asset at upload time to frame what the client should focus on. The primary use case is image-based asset review; PDFs and external design links use a simpler text-only fallback. No multi-stage approval chains, no video, no free-draw markup. The bet is that freelancers lose deals not because their review tools lack features, but because their *clients* find those tools confusing, and because ambiguous "approved with changes" feedback creates rework. Creative Review is optimized for the reviewer, and forces a clean decision.

## 2. Problem statement

Freelance designers and small creative teams currently manage review cycles through one of three painful patterns:

1. **Email threads and attachments.** Feedback is fragmented, decisions are ambiguous, deadlines slip silently.
2. **Heavyweight proofing tools** (Filestage, Ziflow, ReviewStudio). Feature-rich but clients often refuse to use them — "my clients don't know this software" is one of the most common G2 complaints.
3. **Shared drives + verbal approval.** Nothing is auditable; nothing triggers a notification when something changes.

All three cost the freelancer hours of chasing and re-explaining. Creative Review aims to cut the "time from asset delivered to decision received" by >50% compared to email, and to raise client completion rates compared to existing proofing tools.

## 3. Goals and non-goals

**Goals (v1):**
- A client can go from "link in email" to "decision submitted" in under 30 seconds on first use, with no account creation.
- An admin can upload a new asset and have the client notified within 60 seconds.
- Every asset has a clear, auditable status at all times.
- The Friday 12:00 local-time weekly digest ships reliably.
- Clients can drop numbered pin annotations on image assets with one click and attach a comment to each pin.

**Non-goals (v1):**
- Annotations on anything other than image assets. PDFs and external design links use text-only feedback.
- Pixel-accurate markup beyond click-to-pin (no rectangle select, no freehand draw, no blur-to-redact, no text highlighting). This is a permanent product constraint, not a v1 deferral.
- Video/audio review (defer — clear scope wedge vs. Frame.io et al.).
- Multi-stage approval routing with thresholds (PageProof territory).
- Adobe Creative Cloud / Figma plugins.
- Real-time collaborative commenting.
- Native mobile apps (mobile web is sufficient for v1).

## 4. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Time-to-first-review (asset upload → client decision) | Median < 24 hours |
| Client decision completion rate | > 85% of assets decided before deadline |
| Admin weekly active | > 60% of paying admins log in weekly |
| Client first-session success rate | > 90% render + submit a decision without support |
| Friday digest open rate | > 40% |
| NPS (admins) | > 40 |

## 5. User roles

### Admin
Freelance designer or member of a creative team. Uploads assets, manages clients and projects, monitors status, exports reports. Authenticated via email + password or magic link.

### Client reviewer
The admin's client or their client's stakeholder. Reviews assets and renders decisions. **No account required** — accesses the app via signed magic link tied to their email. Optional password-protected mode for sensitive work.

### (Out of scope for v1) Team member
An additional admin within the same workspace. Stub the data model for it; defer the UI.

## 6. Core user journeys

### 6.1 Admin onboarding → first client review
1. Admin signs up, creates a workspace.
2. Admin creates their first client (name, email, optional logo).
3. Admin creates a project under that client (name, deadline, optional description).
4. Admin uploads an asset (drag-drop or external link), selects type (image / document / design / wireframe), sets a review deadline.
5. System emails client a magic link. Client opens link → lands directly on the review screen.
6. Client reviews, decides thumbs up or down, submits feedback if down.
7. Admin is notified by email immediately.

### 6.2 Client returns for weekly review
1. Friday 12:00 local time, system emails client a digest of all assets still pending across all projects.
2. Client clicks a single link → lands on their "My reviews" dashboard listing all outstanding items.
3. Client works through them one by one.

### 6.3 Project completes
When the last asset in a project is approved:
1. System emails admin "Project X complete" with a summary.
2. Project card on admin dashboard moves to "Completed" state.

## 7. Functional requirements

### 7.1 Admin: client management
- Create, edit, archive clients.
- Each client has: name, primary contact email, optional logo, optional additional reviewer emails.
- List view shows client name, number of active projects, number of pending reviews, completion rate.

### 7.2 Admin: project management
- Create projects nested under a client.
- Each project has: name, description, deadline, status (`draft` / `in_review` / `completed` / `archived`).
- Project is `completed` when every non-archived asset within it has status `approved`.

### 7.3 Admin: asset management
- **Images are the primary asset type.** Annotation support, thumbnail rendering, and preview fidelity are optimized for images; everything else is a secondary fallback.
- Upload assets of type:
  - **Image (primary):** PNG, JPEG, SVG (direct upload, max 25MB). Supports click-to-pin annotations.
  - **Document:** PDF (direct upload, max 25MB). Text-only feedback.
  - **Design / Wireframe:** PNG or JPEG upload (treated as image, supports annotations), *or* external URL (Figma public link, Framer, etc.) — URL-based assets get text-only feedback.
- **Upload note (optional).** At upload time the admin can attach a short note (plain text, max 500 characters) to the asset version. This note is displayed prominently on the client's initial review screen, pinned to the top of the comments panel. Use cases: "Please focus on the color palette — logo is locked." / "This is v2 addressing the shadow feedback." / "FYI we're still waiting on the final copy, that's why there's lorem ipsum below the fold."
- Each asset has: name, type, uploader, upload date, review deadline, status (`pending` / `approved` / `rejected` / `revision_submitted`), current version number.
- Each asset version has: version number, storage URL or external URL, uploader, upload timestamp, upload note.
- Admin can upload a new version of an existing asset. Previous decisions, annotations, and upload notes are preserved on the prior version (read-only); the new version enters `pending` with a clean canvas and its own fresh upload note.
- Admin can delete/archive an asset.

### 7.4 Admin: review oversight
- Dashboard view: clients → projects → assets, with status pills.
- Filter/sort: by client, by status, by deadline proximity.
- Per-asset detail view: all decisions, feedback text, timestamps, reviewer identity.

### 7.5 Admin: reminders
- Manual "Send reminder" button per project, which emails every client reviewer listing all pending assets.
- Rate-limited: max one manual reminder per project per 24 hours.

### 7.6 Admin: reports
- Per-client report: all assets, status, decision dates, feedback text. Exportable to CSV and PDF.
- Cross-client report: all assets across all clients, filterable by status and date range.

### 7.7 Client: review dashboard
- "My reviews" list: all pending assets across all projects the client has access to.
- Sort by: deadline (default, ascending), newest, project.
- Shows thumbnail, asset name, project, deadline, "Review" button.

### 7.8 Client: review screen

The review flow is **two-state** by design. The initial state is a clean, read-only view with two buttons; the annotator and feedback fields are not visible until the reviewer formally requests changes. This enforces the product's core rule: **approvals are exact-as-is; only rejections carry feedback.**

**7.8.1 Initial review state (all asset types).**

- Two-column layout: asset preview (left, ~60%) + context panel (right, ~40%).
- Preview area renders the asset (images inline, PDFs in browser viewer, external URLs in iframe with "Open in new tab" fallback).
- Context panel shows:
  - The admin's upload note (if present) in a distinct styled card at the top, labeled clearly ("Note from Dana" or similar).
  - Asset metadata: version number, upload date, uploader name.
  - If this is v2+ of a previously rejected asset, a collapsed summary of the previous round's feedback is shown read-only ("3 pins on v1 — click to view").
- Bottom of context panel: two primary buttons: **Approve** and **Request changes**.
- **No feedback textarea. No clickable image. No annotator.** The surface is deliberately minimal to prevent fiddling.
- On **Approve**:
  - A lightweight confirmation dialog appears: "Approve this asset exactly as is? Your approval means no changes are needed." [Cancel] [Yes, approve]
  - On confirm: submit decision, transition to read-only "Approved" state, notify admin.
- On **Request changes**: transition to state 7.8.2 or 7.8.3 depending on asset type.

**7.8.2 Request changes state — images (primary flow).**

- Triggered by clicking "Request changes" on an image asset in the initial review state.
- Same two-column layout, but now:
  - The preview becomes interactive — clicking anywhere on the image drops a new numbered pin and opens an inline draft comment on the right.
  - The admin's upload note remains pinned to the top of the panel as read-only context.
  - Below the note, annotations render as numbered comment cards (1, 2, 3…) in creation order.
  - Pins are numbered 1, 2, 3… by creation time. Display numbers are computed at render time, so deleting a middle pin cleanly renumbers the rest.
  - Hovering a pin highlights its comment card and vice versa; clicking scrolls the comment into view.
  - Reviewer can edit or delete their own comments before submitting.
- Bottom of context panel: **Submit changes requested** button (primary) and **Back** (subtle, returns to 7.8.1 without discarding drafts).
- **Submit requirements:** at least one annotation with comment text ≥ 1 character. The submit button is disabled until satisfied. A helper line explains: "Add at least one pin to describe what needs to change."
- An optional top-level "general feedback" textarea is available below the pinned comments for holistic feedback not tied to a specific pin location. Not required if pins are present.
- On submit: decision stored as `reject` verdict, all annotations persisted, admin notified immediately.

**7.8.3 Request changes state — non-images (PDFs, external URLs).**

- Triggered by clicking "Request changes" on a non-image asset.
- Single-column layout: preview stays visible; a feedback textarea appears below it.
- Upload note remains visible as read-only context above the textarea.
- **Submit requirements:** feedback text ≥ 3 characters.
- **Submit changes requested** button (primary) and **Back** (returns to 7.8.1).
- On submit: decision stored as `reject` verdict with feedback text, admin notified immediately.

**Key product invariant (engineering: enforce server-side):**
- A decision with verdict `approve` must have no `feedback_text` and no associated annotations. Reject the submission at the API layer if either is present.
- A decision with verdict `reject` must have at least one of: (a) one or more annotations by this reviewer on this version, or (b) `feedback_text` ≥ 3 characters.

### 7.9 Annotations (image assets only)

- **Annotations are only accessible in the Request Changes state (7.8.2).** The annotator is not visible or interactive on the initial review screen. This is a hard product rule, not a UX preference: it enforces the "approvals are exact-as-is" invariant at the interface level.
- Every annotation belongs to an `AssetVersion`, not an `Asset`. Annotations do not carry forward when a new version is uploaded — coordinates wouldn't map meaningfully across versions.
- Coordinates are stored as decimal percentages (0.0000 – 1.0000) of the image's natural width and height, not as absolute pixels. This keeps pins aligned across responsive rendering and high-DPI displays.
- Display numbering is derived at render time from creation order (oldest = 1). Numbers are not stored in the database.
- Each annotation has: coordinates, comment text (required, ≥ 1 character), reviewer identity, timestamp, optional `resolved_at` for future "marked as addressed" UX.
- Reviewer can edit/delete their own annotations while in the Request Changes state, prior to submitting the decision. Post-decision, annotations are immutable.
- Admin view (asset detail) shows all annotations as numbered entries in the review activity feed, with a small thumbnail of the image showing pin locations if feasible.

### 7.10 Notifications

All notifications are email in v1. SMS and in-app notifications are out of scope.

| Event | Recipient | Timing |
|---|---|---|
| New asset uploaded | Client reviewer(s) | Immediate (within 60 sec) |
| Asset decision submitted | Admin | Immediate |
| Project completed (all assets approved) | Admin | Immediate |
| Weekly digest of pending assets | Client reviewer(s) | Every Friday at 12:00, client's local timezone |
| Manual reminder | Client reviewer(s) | On admin trigger |

- Emails are sent via a transactional provider (Postmark, Resend, or SES).
- Each email has a signed, time-limited magic link to the relevant asset or dashboard.
- Emails include a one-click "Unsubscribe from digests" link for reviewers.

## 8. Data model (v1)

```
Workspace
  id, name, plan, created_at
  ├── Admin (User)
  │     id, email, password_hash, workspace_id, role, created_at
  └── Client
        id, workspace_id, name, primary_email, logo_url, archived
        └── ClientReviewer
        │     id, client_id, email, name, timezone, created_at
        └── Project
              id, client_id, name, description, deadline, status, created_at
              └── Asset
                    id, project_id, name, type, current_version_id, deadline, status, created_at
                    └── AssetVersion
                          id, asset_id, version_number, storage_url_or_external_url,
                          upload_note (nullable, max 500 chars), uploaded_by, uploaded_at
                          ├── Decision
                          │     id, asset_version_id, reviewer_id, verdict (approve|reject),
                          │     feedback_text (nullable — MUST be null when verdict=approve), created_at
                          └── Annotation          -- image assets only, Request Changes state only
                                id, asset_version_id, reviewer_id, x_pct (0.0000-1.0000),
                                y_pct (0.0000-1.0000), comment_text, resolved_at (nullable), created_at

Notification
  id, kind, recipient_email, payload_json, sent_at, opened_at
```

**Notes on the data model:**
- Annotations are scoped to `AssetVersion` so they stay anchored to the specific image they were drawn on.
- `x_pct` / `y_pct` are decimals, not pixels. Resolution-independent.
- Display numbers (the "1", "2", "3" footnote labels) are never stored — they're computed at render time from `ORDER BY created_at ASC` over the annotations on a version. This means deleting a middle pin cleanly renumbers the rest.
- `Annotation.asset_version_id` should have an enforced constraint that the parent asset's `type = 'image'`. Enforce in application code; also add a DB check if using Postgres 12+.
- **Decision invariants (enforce at the API layer):**
  - `verdict = 'approve'` → `feedback_text` must be null AND no `Annotation` rows may exist for this `(reviewer_id, asset_version_id)` tuple. Reject the request with 400 otherwise.
  - `verdict = 'reject'` → at least one of: `feedback_text` is present and ≥ 3 chars, OR at least one `Annotation` row exists for this `(reviewer_id, asset_version_id)` tuple.
  - `upload_note` is plain text, server-side sanitized, never rendered as HTML.

## 9. Technical architecture

Aligned with the team's existing supported stack. No new services introduced that aren't already in use.

**Application layer**
- **Next.js** (App Router) with **React** and **TypeScript** (strict mode).
- **Tailwind CSS** for styling. **shadcn/ui** for base components.
- Client review screen is mobile-first; admin screens are desktop-first but responsive.
- Server logic lives in Next.js Server Actions and Route Handlers. No separate backend service in v1.

**Data layer — Supabase**
- **Supabase Postgres** is the primary datastore. All tables per the data model in section 8.
- **Supabase Auth** handles both admins (email + password) and client reviewers (passwordless magic link / OTP). Reviewers become real Supabase users on first magic-link click — this simplifies session management and means "no account required" is a UX promise, not an auth-layer hack.
- **Row-Level Security (RLS)** enforces multi-tenancy at the database level, not in application code. Every table has policies keyed off `workspace_id` (for admin-owned data) or `client_reviewer_id` (for reviewer-accessible data). This is the core isolation mechanism — application code is a secondary defense, not the primary one.
- **Supabase Storage** holds uploaded asset files (PNG, JPG, SVG, PDF). Signed URLs with short TTLs for client-side rendering. Separate public/private buckets; all review-bound assets are private by default.
- Schema migrations via the Supabase CLI (`supabase/migrations/*.sql`), checked into the repo.

**Email — Resend**
- All transactional email: new-asset notifications, decision-submitted alerts, project-complete notifications, Friday digest, manual reminders.
- Templates live in the repo as React Email components so they're typed and previewable in dev.
- Every email includes signed magic links (generated via Supabase Auth) that deep-link to the relevant asset or dashboard.

**Background jobs — Railway cron**
- Friday 12:00 digest: a Railway cron service runs a small Node worker hourly, queries reviewers whose local time is within the noon hour on Friday, and enqueues Resend sends.
- This keeps scheduled work inside the deployment boundary (no external scheduler service needed).
- Alternative considered: Supabase `pg_cron` + Edge Functions. Rejected for v1 because the app's scheduling logic is simple enough that a hourly Node script is more debuggable.

**Billing — Stripe Subscriptions**
- Standard subscription product: Solo, Studio, Agency tiers (plus free self-hosted).
- Webhook handler on a Next.js Route Handler updates `Workspace.plan` and seat/storage quotas.
- Billing Portal link exposed in admin settings.

**Observability**
- **Sentry** for error tracking — wired to both the Next.js app (client and server) and the Railway cron worker from day one. Source maps uploaded in CI.
- **Amplitude** for product analytics. Key events instrumented from milestone 4 onward:
  - Admin: `signup`, `client_created`, `asset_uploaded` (with asset type), `reminder_sent`, `project_completed`
  - Client: `magic_link_opened`, `decision_submitted` (with verdict), `annotation_created`, `feedback_submitted`
  - System: `digest_sent`, `email_delivered`, `email_bounced`

**Hosting — Railway**
- Single Railway project with two services: the Next.js app and the cron worker.
- Preview environments per pull request.
- Self-hosting path: `docker compose` file in the repo runs the Next.js app + a local Postgres + a mock S3 (MinIO) for users who don't want Supabase. Open-source release ships with Supabase swap-out documentation.

## 10. Monetization surface (informs v1 data model)

Track at the workspace level:
- Plan tier (`oss` / `solo` / `studio` / `agency`)
- Storage used
- Admin seat count
- Custom domain flag
- White-label flag (logo/color overrides on client-facing pages)

v1 ships with these fields even if gating is lenient; tightens in later releases.

## 11. Open questions

1. **Approve confirmation modal wording.** Current recommendation: "Approve this asset exactly as is? Your approval means no changes are needed." Is "exactly as is" too stark? Alternatives: "Approve as final?" or just "Approve?". Suggest A/B testing for conversion rate impact.
2. **Multi-reviewer decision logic.** If a client has multiple reviewers, does asset become `approved` when *any* reviewer approves, or only when *all* approve? Recommendation: "first reviewer decides" for v1 simplicity, upgrade to "all must approve" in v2 as a per-project toggle.
3. **Timezone handling for Friday 12:00.** Is the digest time set at the client or client-reviewer level? Recommendation: per-reviewer timezone, defaulting to admin's timezone on invite.
4. **Revision flow.** When admin uploads v2 of a rejected asset, should previous reviewers be auto-notified, or does the admin explicitly "resubmit"? Recommendation: auto-notify with an opt-out. Upload note is a natural place for the admin to call out what changed.
5. **External design links.** How do we handle link-rot or permission changes on Figma public links? Recommendation: periodic fetch-check, warn admin if link goes 404.
6. **Annotations on non-primary reviewers' behalf.** If two reviewers both request changes on the same image, are both sets of pins visible to each other, or private until decisions are submitted? Recommendation for v1: pins become visible to everyone on the asset once a reviewer submits their decision. While a reviewer is still drafting, their pins are private. This avoids the "someone else already pinned that" awkwardness.
7. **Zoom and pan on annotated images.** Do we need pinch-zoom and pan for very large/detailed images? Recommendation: ship without it in v1, measure support tickets, add if it's a top-3 request.
8. **"Back" from Request Changes with drafts.** If a reviewer clicks Request Changes, drops two pins, then clicks Back — do we preserve the drafts or discard? Recommendation: preserve in local storage only, not persisted server-side until submit. Warn on navigate-away.

## 12. Out of scope (v1) — reserved for v2+

- Annotations on PDFs, documents, or external design links (images only in v1)
- Pixel markup beyond click-to-pin (rectangle select, freehand draw, arrows, text highlights, blur-to-redact) — **this is a permanent product constraint, not a deferral**
- Video and audio asset types
- Version comparison (side-by-side diff)
- Figma / Adobe CC plugin
- Slack / Teams notifications
- Multi-stage approval workflows with thresholds
- Team workspaces with roles beyond "admin"
- Payment integration for freelancer → client invoicing
- AI-assisted summary of feedback across assets

## 13. Rollout plan

- **Week 0–4:** Build admin and client core flows (auth, clients, projects, assets, decisions, notifications). Text-only feedback throughout.
- **Week 5:** Add image annotator — pin rendering, coordinate capture, comments panel, decision integration.
- **Week 6–7:** Multi-tenant, billing (Stripe), transactional emails, Friday digest job.
- **Week 8:** Closed beta with 10 freelancer design contacts.
- **Week 9:** Public launch on Product Hunt + Indie Hackers; open-source the core repo the same day.
- **Week 10–13:** Iterate on the top three friction points surfaced by beta.
