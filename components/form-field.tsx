import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function FormField({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}
