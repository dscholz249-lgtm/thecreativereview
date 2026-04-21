// The "wedge" — the two product invariants framed as a user benefit rather
// than as engineering rules. Keep the two states visually distinct so the
// "Approve is clean, Request Changes is where detail happens" hierarchy
// reads at a glance.

export function LandingValueProp() {
  return (
    <section className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            The idea
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Two states. One decision.
          </h2>
          <p className="mt-4 text-neutral-600">
            Most review tools blur the line between &quot;looks good&quot;
            and &quot;a few tweaks.&quot; Creative Review keeps them
            separate on purpose.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Approve
            </p>
            <p className="mt-2 text-lg font-medium text-neutral-900">
              One click. No questions asked.
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Approvals carry no annotations, no &quot;but also…&quot; text.
              If your client approves, the asset is done. You never wonder
              whether there were quiet caveats you missed.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Request changes
            </p>
            <p className="mt-2 text-lg font-medium text-neutral-900">
              Pin exactly what needs attention.
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              The annotator unlocks only when your client asks for changes.
              Click-to-pin on images, numbered comments, and a clear list
              of what to revise — no threaded arguments.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
