# ADR 0001 — Enforce decision invariants at three layers

**Status:** Accepted
**Date:** 2026-04-17

## Context

The PRD (section 7.8 + section 8) defines two product invariants that the
whole product wedge depends on:

1. **Approve has no feedback.** A `Decision` with `verdict = 'approve'` must
   have `feedback_text IS NULL` and zero `Annotation` rows for
   `(reviewer_id, asset_version_id)`.
2. **Annotator only in Request Changes.** The annotator UI is not rendered on
   the initial review state.

The brief (`docs/CLAUDE_CODE_PROMPT.md`) is explicit: *"Encode them in types,
enforce them at the API layer, back them with a database check constraint.
Don't let them degrade over the course of the build."*

## Decision

Enforce invariant 1 at **three layers**:

1. **Types** — `lib/domain/decision.ts` exports a Zod-backed discriminated
   union over `verdict`. The approve branch has no `feedback_text` or
   `annotations` in its type, so TypeScript refuses to add them at a call
   site.
2. **API** — Server Actions parse incoming FormData with `DecisionInputSchema`
   and reject with a 400-equivalent error on any invariant violation. The
   action also checks annotation count for the approve path before inserting.
3. **Database** — `supabase/migrations/20260417120000_initial_schema.sql`
   adds:
   - CHECK constraint `decisions_approve_has_no_feedback` on the `decisions`
     table (column-level, fast).
   - Trigger `decisions_enforce_approve_has_no_annotations` (cross-table,
     BEFORE INSERT on decisions).
   - Trigger `annotations_enforce_not_after_approve` (the reverse direction).
   - DEFERRABLE INITIALLY DEFERRED constraint trigger
     `decisions_enforce_reject_has_content` for invariant 2.

Invariant 2 (annotator UI hidden on initial review) is enforced at the UI
layer only (separate route, separate component) — it's a rendering rule, not
a data rule. The database side of it is covered by the "reject must have
content" invariant.

## Consequences

- A malicious caller who skips the Server Action and writes directly via the
  Supabase client still cannot corrupt state — the DB will reject it.
- Adding the cross-table annotation check to the approve path costs one extra
  SELECT per decision, paid only on verdict writes (rare). Acceptable.
- If we ever need to allow "approve with annotations" (e.g., approval with a
  "next time" note), we change the product spec *and* the trigger. We do not
  have a shortcut that bypasses one layer.

## Alternatives considered

- **App-layer only.** Rejected: a direct Supabase client call bypasses it.
- **DB only.** Rejected: error messages from triggers are poor UX; we want
  friendly Zod errors surface-first.
- **Single "smart" endpoint that accepts optional fields and decides.**
  Rejected: it invites the exact drift we're trying to prevent.
