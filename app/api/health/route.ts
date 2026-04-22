import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/health";

// Health endpoint — suitable for Railway's deploy healthcheck, external
// uptime monitors, or a quick manual curl. Returns 200 if every
// critical check passes (warnings don't change status), 503 if any
// critical check fails.
//
// Node runtime because the checks touch Supabase's admin client, which
// uses Node crypto through @supabase/supabase-js.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const report = await runHealthChecks();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
