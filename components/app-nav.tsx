"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/actions";

type NavProps = {
  workspaceName: string;
  userEmail: string;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
];

export function AppNav({ workspaceName, userEmail }: NavProps) {
  const [, startTransition] = useTransition();

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Creative Review
        </Link>
        <nav className="flex items-center gap-5 text-sm text-neutral-600">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-neutral-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="gap-2" />}
          >
            <span className="max-w-[180px] truncate">{workspaceName}</span>
            <span aria-hidden className="text-neutral-400">▾</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem disabled className="flex-col items-start">
              <span className="text-xs text-neutral-500">Signed in as</span>
              <span className="text-sm">{userEmail}</span>
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
