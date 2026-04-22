import Link from "next/link";
import type { ReactNode } from "react";

type BreadcrumbSegment = { href?: string; label: string };

// Page header used across the admin surface. Slab-serif h1, optional
// breadcrumbs above, optional actions row on the right. Used inside a
// `.cr-surface` (from `app/(app)/layout`) so the h1 picks up the 44px
// display size automatically.
export function PageHeading({
  title,
  description,
  breadcrumbs,
  actions,
  leading,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: ReactNode;
  // Optional element rendered to the left of the title (e.g. an Avatar on
  // the client-detail page). Wrapping in a flex row so spacing stays even.
  leading?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? <Crumbs items={breadcrumbs} /> : null}
        <div className="flex items-center gap-3.5">
          {leading}
          <div>
            <h1
              className="cr-display"
              style={{
                fontSize: 40,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                fontWeight: 800,
              }}
            >
              {title}
            </h1>
            {description ? (
              <p
                className="mt-2 text-[16px]"
                style={{ color: "var(--cr-muted)" }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}

export function Crumbs({ items }: { items: BreadcrumbSegment[] }) {
  return (
    <nav
      className="mb-3 flex flex-wrap items-center gap-1 text-[14px]"
      style={{ color: "var(--cr-muted)", letterSpacing: "0.01em" }}
    >
      {items.map((seg, i) => {
        const current = i === items.length - 1;
        return (
          <span key={`${seg.label}-${i}`} className="flex items-center gap-1">
            {seg.href && !current ? (
              <Link
                href={seg.href}
                className="hover:text-[var(--cr-ink)]"
                style={{ color: "var(--cr-muted)" }}
              >
                {seg.label}
              </Link>
            ) : (
              <span
                style={{
                  color: current ? "var(--cr-ink)" : "var(--cr-muted)",
                  fontWeight: current ? 600 : 500,
                }}
              >
                {seg.label}
              </span>
            )}
            {i < items.length - 1 ? (
              <span style={{ color: "var(--cr-line-strong)", margin: "0 6px" }}>
                /
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}

// LinkButton kept for routes that haven't migrated yet. Same API as before;
// styling now uses the cr-btn classes so it matches the rest of the surface.
export function LinkButton({
  href,
  children,
  variant = "default",
  size = "default",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}) {
  const classes = ["cr-btn"];
  if (variant === "default") classes.push("cr-btn-primary");
  if (variant === "outline") classes.push("");
  if (variant === "ghost") classes.push("cr-btn-ghost");
  if (size === "sm") classes.push("cr-btn-sm");
  if (size === "lg") classes.push("cr-btn-lg");
  return (
    <Link href={href} className={classes.join(" ").trim()}>
      {children}
    </Link>
  );
}
