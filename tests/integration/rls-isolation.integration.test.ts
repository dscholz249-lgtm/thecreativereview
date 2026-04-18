import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Milestone 1 DoD: "An integration test proves that an admin from workspace A
// cannot read workspace B data, even with a hand-crafted JWT."
//
// This test assumes a local Supabase is running (`supabase start`) with the
// initial migration applied (`supabase db reset`). It uses the service role
// key to provision two workspaces + admins, then signs in as each admin via
// the anon key to verify RLS isolates their reads/writes.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// If creds are missing, skip this suite rather than fail noisily — lets unit
// tests run in envs that don't have a local Supabase.
const describeIfReady = SERVICE_ROLE && ANON_KEY ? describe : describe.skip;

describeIfReady("RLS isolation — two workspaces", () => {
  const nonce = Math.random().toString(36).slice(2, 8);
  const emailA = `rls-a-${nonce}@creativereview.test`;
  const emailB = `rls-b-${nonce}@creativereview.test`;
  const password = "rls-test-password-1234";

  let service: SupabaseClient<Database>;
  let workspaceA: string;
  let workspaceB: string;
  let userAId: string;
  let userBId: string;
  let clientAId: string;
  let clientBId: string;

  beforeAll(async () => {
    service = createClient<Database>(URL, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const makeAdmin = async (
      email: string,
      workspaceName: string,
      clientName: string,
    ) => {
      const { data: userRes, error: userErr } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (userErr || !userRes.user) throw userErr ?? new Error("no user");

      const { data: ws, error: wsErr } = await service
        .from("workspaces")
        .insert({ name: workspaceName })
        .select("id")
        .single();
      if (wsErr || !ws) throw wsErr;

      const { error: profileErr } = await service.from("admin_profiles").insert({
        user_id: userRes.user.id,
        workspace_id: ws.id,
        role: "owner",
      });
      if (profileErr) throw profileErr;

      const { data: client, error: clientErr } = await service
        .from("clients")
        .insert({
          workspace_id: ws.id,
          name: clientName,
          primary_email: `contact+${nonce}@${workspaceName.replace(/\s+/g, "").toLowerCase()}.test`,
        })
        .select("id")
        .single();
      if (clientErr || !client) throw clientErr;

      return { userId: userRes.user.id, workspaceId: ws.id, clientId: client.id };
    };

    const a = await makeAdmin(emailA, `WS-A-${nonce}`, `Client-A-${nonce}`);
    const b = await makeAdmin(emailB, `WS-B-${nonce}`, `Client-B-${nonce}`);
    workspaceA = a.workspaceId;
    workspaceB = b.workspaceId;
    userAId = a.userId;
    userBId = b.userId;
    clientAId = a.clientId;
    clientBId = b.clientId;
  });

  afterAll(async () => {
    // Delete users (cascades admin_profiles → workspace fk cleanup).
    await service.auth.admin.deleteUser(userAId).catch(() => {});
    await service.auth.admin.deleteUser(userBId).catch(() => {});
    await service.from("workspaces").delete().eq("id", workspaceA);
    await service.from("workspaces").delete().eq("id", workspaceB);
  });

  async function signedInAs(email: string) {
    const c = createClient<Database>(URL, ANON_KEY!);
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return c;
  }

  it("admin A reads only workspace A clients", async () => {
    const c = await signedInAs(emailA);
    const { data } = await c.from("clients").select("id, workspace_id");
    expect(data).toBeDefined();
    expect(data!.every((row) => row.workspace_id === workspaceA)).toBe(true);
    expect(data!.some((row) => row.id === clientAId)).toBe(true);
    expect(data!.some((row) => row.id === clientBId)).toBe(false);
  });

  it("admin B reads only workspace B clients", async () => {
    const c = await signedInAs(emailB);
    const { data } = await c.from("clients").select("id, workspace_id");
    expect(data!.every((row) => row.workspace_id === workspaceB)).toBe(true);
    expect(data!.some((row) => row.id === clientBId)).toBe(true);
    expect(data!.some((row) => row.id === clientAId)).toBe(false);
  });

  it("admin A cannot INSERT a client into workspace B", async () => {
    const c = await signedInAs(emailA);
    const { data, error } = await c
      .from("clients")
      .insert({
        workspace_id: workspaceB,
        name: "sneaky",
        primary_email: "sneaky@test.test",
      })
      .select();
    // RLS-violated inserts return no rows and typically an error.
    expect(data === null || data.length === 0).toBe(true);
    expect(error).not.toBeNull();
  });

  it("admin A cannot read workspace B directly by id", async () => {
    const c = await signedInAs(emailA);
    const { data } = await c
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceB);
    expect(data).toEqual([]);
  });

  it("admin A sees only their own admin_profile row", async () => {
    const c = await signedInAs(emailA);
    const { data } = await c.from("admin_profiles").select("user_id, workspace_id");
    expect(data!.every((row) => row.workspace_id === workspaceA)).toBe(true);
  });
});
