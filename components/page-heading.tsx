import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BreadcrumbSegment = { href?: string; label: string };

export function PageHeading({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="mb-2 flex items-center gap-1 text-xs text-neutral-500">
            {breadcrumbs.map((seg, i) => (
              <span key={`${seg.label}-${i}`} className="flex items-center gap-1">
                {seg.href ? (
                  <Link href={seg.href} className="hover:text-neutral-800">
                    {seg.label}
                  </Link>
                ) : (
                  <span className="text-neutral-700">{seg.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <span className="text-neutral-300">/</span>}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-neutral-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: ReactNode;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size: "sm" }))}
    >
      {children}
    </Link>
  );
}
