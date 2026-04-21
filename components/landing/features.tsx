import type { ReactNode } from "react";

type Feature = {
  title: string;
  body: string;
  icon: ReactNode;
};

// Plain inline SVGs so the section has no runtime dep on lucide-react for
// icons Claude Design may want to swap anyway. Decorative only — real
// visuals / screenshots land during the design pass.
const features: Feature[] = [
  {
    title: "Client review inbox",
    body: "Each client gets a simple inbox of assets waiting on them. No accounts to manage, no workspaces to switch — a magic link and they're in.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
  },
  {
    title: "Click-to-pin annotations",
    body: "Point at exactly what needs to change. Pins hold percentage-based coordinates so feedback stays accurate across screen sizes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12Z" />
      </svg>
    ),
  },
  {
    title: "Version history you can trust",
    body: "Every upload is a new version. Previous decisions and feedback stay visible forever — no lost context when you iterate.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <path d="M3 3v5h5" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: "Reminders that respect the weekend",
    body: "Manual nudges when you need them. Automatic Friday-noon digests so your clients remember Monday's deadline without Sunday-night inbox guilt.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
  },
  {
    title: "Images, PDFs, and external designs",
    body: "Upload PNGs, JPEGs, or PDFs up to 25 MB. Link directly to Figma or external design tools when the file doesn't make sense to copy.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
      </svg>
    ),
  },
  {
    title: "Audit trail by default",
    body: "Every decision is immutable. Who approved what, when, on which version — visible to you forever, no plan gate, no extra setup.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Everything you need, nothing you don&apos;t
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Built for one job. Done well.
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-300"
          >
            <div className="mb-4 inline-flex size-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
              {f.icon}
            </div>
            <p className="text-base font-medium text-neutral-900">{f.title}</p>
            <p className="mt-2 text-sm text-neutral-600">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
