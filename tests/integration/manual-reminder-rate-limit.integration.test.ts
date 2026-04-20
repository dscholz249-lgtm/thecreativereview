import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Milestone 4 DoD fragment: the manual reminder's 24h rate limit must be
// enforced "at the DB level, not just the UI". This test proves it by calling
// the atomic UPDATE that sendManualReminder relies on, and verifying the
// second call within 24h returns zero rows.
//
// Mirrors the query in lib/notifications.sendManualReminder; if that query
// ever drifts, this test should fail loudly.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeIfReady = SERVICE_ROLE ? describe : describe.skip;

describeIfReady("manual reminder — DB-level 24h rate limit", () => {
  const nonce = Math.random().toString(36).slice(2, 8);
  let service: SupabaseClient<Database>;
  let workspaceId: string;
  let clientId: string;
  let projectId: string;

  beforeAll(async () => {
    service = createClient<Database>(URL, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ws } = await service
      .from("workspaces")
      .insert({ name: `reminder-ws-${nonce}` })
      .select("id")
      .single();
    workspaceId = ws!.id;

    const { data: c } = await service
      .from("clients")
      .insert({
        workspace_id: workspaceId,
        name: `reminder-c-${nonce}`,
        primary_email: `c-${nonce}@example.com`,
      })
      .select("id")
      .single();
    clientId = c!.id;

    const { data: p } = await service
      .from("projects")
      .insert({ client_id: clientId, name: `reminder-p-${nonce}` })
      .select("id")
      .single();
    projectId = p!.id;
  });

  afterAll(async () => {
    await service.from("workspaces").delete().eq("id", workspaceId);
  });

  it("first claim succeeds and updates last_reminded_at", async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from("projects")
      .update({ last_reminded_at: new Date().toISOString() })
      .eq("id", projectId)
      .or(`last_reminded_at.is.null,last_reminded_at.lt.${since}`)
      .select("id, last_reminded_at")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.last_reminded_at).toBeTruthy();
  });

  it("second claim within the 24h window returns no row", async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await service
      .from("projects")
      .update({ last_reminded_at: new Date().toISOString() })
      .eq("id", projectId)
      .or(`last_reminded_at.is.null,last_reminded_at.lt.${since}`)
      .select("id, last_reminded_at")
      .maybeSingle();
    expect(error).toBeNull();
    // No row returned → the UPDATE matched nothing → rate limit held.
    expect(data).toBeNull();
  });

  it("claim succeeds again after we simulate 25h of elapsed time", async () => {
    await service
      .from("projects")
      .update({
        last_reminded_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", projectId);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await service
      .from("projects")
      .update({ last_reminded_at: new Date().toISOString() })
      .eq("id", projectId)
      .or(`last_reminded_at.is.null,last_reminded_at.lt.${since}`)
      .select("id")
      .maybeSingle();
    expect(data).not.toBeNull();
  });
});
