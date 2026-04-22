"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Chevron } from "@/components/cr-icons";
import { CreativeReviewLogo } from "@/components/creative-review-logo";
import { logout } from "@/app/(auth)/actions";

type NavProps = {
  workspaceName: string;
  userEmail: string;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", prefix: "/dashboard" },
  { href: "/clients", label: "Clients", prefix: "/clients" },
  { href: "/projects", label: "Reviews", prefix: "/projects" },
];

export function AppNav({ workspaceName, userEmail }: NavProps) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  return (
    <header
      className="sticky top-0 z-20 bg-[var(--cr-card)]"
      style={{ borderBottom: "2px solid var(--cr-ink)" }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3 sm:px-10">
        <div className="flex items-center gap-9">
          <Link href="/dashboard" aria-label="Dashboard">
            <CreativeReviewLogo fontSize={16} />
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(item.prefix + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-1.5 text-[16px] font-semibold transition-colors"
                  style={{
                    color: active ? "var(--cr-ink)" : "var(--cr-muted)",
                    borderBottom: active
                      ? "2px solid var(--cr-ink)"
                      : "2px solid transparent",
                    // Negative bottom margin so the underline sits on the
                    // 2px topbar rule rather than hovering above it.
                    marginBottom: -18,
                    paddingBottom: 16,
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-[15px] font-semibold"
                style={{
                  background: "var(--cr-card)",
                  border: "1.5px solid var(--cr-ink)",
                  borderRadius: "var(--cr-radius)",
                  boxShadow: "2px 2px 0 var(--cr-ink)",
                  color: "var(--cr-ink)",
                }}
              />
            }
          >
            <span
              aria-hidden
              className="inline-block size-[18px] rounded"
              style={{ background: "var(--cr-ink)" }}
            />
            <span className="max-w-[200px] truncate">{workspaceName}</span>
            <Chevron />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem disabled className="flex-col items-start">
              <span
                className="text-[11px] font-bold uppercase tracking-[0.08em]"
                style={{ color: "var(--cr-muted)" }}
              >
                Signed in as
              </span>
              <span className="text-sm">{userEmail}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/billing" />}>
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                startTransition(async () => {
                  await logout();
                })
              }
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
