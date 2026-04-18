/**
 * Seeds a demo workspace for local development.
 *
 * Uses the service role key (bypasses RLS) — acceptable here because this is
 * a local-dev bootstrap script that creates data a real signup flow couldn't
 * manufacture in one pass (e.g., an auth.users row with a known password).
 *
 * Usage:
 *   npm run db:seed
 *
 * Prints the seeded admin credentials so you can log in and see the data.
 */

import { config as loadEnv } from "dotenv";
// Next.js loads .env.local automatically at runtime, but Node scripts don't.
// Prefer .env.local (where secrets live) and fall back to .env.
loadEnv({ path: [".env.local", ".env"] });
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const SEED_ADMIN_EMAIL = "demo@creativereview.test";
const SEED_ADMIN_PASSWORD = "password-demo-123";
const SEED_WORKSPACE_NAME = "Dana Design Studio (demo)";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("→ Cleaning prior demo data…");
  // Delete existing auth user by email (cascades to admin_profiles → workspace).
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.email === SEED_ADMIN_EMAIL);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
  }
  // Also wipe orphan workspaces from prior runs (no admin_profile).
  await admin.from("workspaces").delete().eq("name", SEED_WORKSPACE_NAME);

  console.log("→ Creating admin user…");
  const { data: userResult, error: userError } = await admin.auth.admin.createUser({
    email: SEED_ADMIN_EMAIL,
    password: SEED_ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (userError || !userResult.user) {
    throw new Error(`createUser failed: ${userError?.message}`);
  }
  const userId = userResult.user.id;

  console.log("→ Creating workspace…");
  const { data: workspace, error: wsError } = await admin
    .from("workspaces")
    .insert({ name: SEED_WORKSPACE_NAME, plan: "solo" })
    .select("id")
    .single();
  if (wsError || !workspace) throw new Error(`workspace insert: ${wsError?.message}`);

  console.log("→ Creating admin_profile…");
  const { error: profileError } = await admin.from("admin_profiles").insert({
    user_id: userId,
    workspace_id: workspace.id,
    role: "owner",
    name: "Dana Demo",
    timezone: "America/Los_Angeles",
  });
  if (profileError) throw new Error(`admin_profile insert: ${profileError.message}`);

  console.log("→ Creating clients…");
  const { data: clients, error: clientsError } = await admin
    .from("clients")
    .insert([
      {
        workspace_id: workspace.id,
        name: "Acme Coffee",
        primary_email: "ops@acme.test",
      },
      {
        workspace_id: workspace.id,
        name: "Blue Heron Bistro",
        primary_email: "marketing@blueheron.test",
      },
    ])
    .select("id, name");
  if (clientsError || !clients) throw new Error(`clients: ${clientsError?.message}`);
  const [acme, heron] = clients;

  console.log("→ Creating projects…");
  const { data: projects, error: projectsError } = await admin
    .from("projects")
    .insert([
      {
        client_id: acme!.id,
        name: "Spring menu refresh",
        description: "Updated photography + menu layouts",
        status: "in_review",
      },
      {
        client_id: acme!.id,
        name: "Loyalty card redesign",
        description: "New rewards tier mailers",
        status: "draft",
      },
      {
        client_id: heron!.id,
        name: "Summer dinner series",
        description: "Instagram + print collateral",
        status: "in_review",
      },
    ])
    .select("id, name, client_id");
  if (projectsError || !projects) throw new Error(`projects: ${projectsError?.message}`);

  console.log("→ Creating assets and versions…");
  const assetSpecs: Array<{
    name: string;
    type: "image" | "document" | "design" | "wireframe";
    project_idx: number;
    storage_path: string | null;
    external_url: string | null;
    upload_note: string | null;
  }> = [
    { name: "Menu hero v1.png", type: "image", project_idx: 0, storage_path: "demo/menu-hero-v1.png", external_url: null, upload_note: "Please focus on the color palette — logo is locked." },
    { name: "Menu back cover.png", type: "image", project_idx: 0, storage_path: "demo/menu-back-cover.png", external_url: null, upload_note: null },
    { name: "Menu specsheet.pdf", type: "document", project_idx: 0, storage_path: "demo/menu-specsheet.pdf", external_url: null, upload_note: "Printer specs — feedback on margins only please." },
    { name: "Instagram ad A.jpg", type: "image", project_idx: 0, storage_path: "demo/ig-ad-a.jpg", external_url: null, upload_note: null },
    { name: "Loyalty card front.png", type: "image", project_idx: 1, storage_path: "demo/loyalty-front.png", external_url: null, upload_note: "v2 addressing the shadow feedback." },
    { name: "Loyalty card back.png", type: "image", project_idx: 1, storage_path: "demo/loyalty-back.png", external_url: null, upload_note: null },
    { name: "Dinner series poster.png", type: "image", project_idx: 2, storage_path: "demo/dinner-poster.png", external_url: null, upload_note: null },
    { name: "Dinner series menu.pdf", type: "document", project_idx: 2, storage_path: "demo/dinner-menu.pdf", external_url: null, upload_note: "Copy finalized, layout still WIP." },
    { name: "Social share template", type: "design", project_idx: 2, storage_path: null, external_url: "https://figma.com/file/demo-social-share", upload_note: "External Figma link — text feedback only." },
    { name: "Hero banner wireframe.png", type: "wireframe", project_idx: 2, storage_path: "demo/hero-wireframe.png", external_url: null, upload_note: null },
  ];

  for (const spec of assetSpecs) {
    const project = projects[spec.project_idx]!;
    const { data: asset, error: assetError } = await admin
      .from("assets")
      .insert({
        project_id: project.id,
        name: spec.name,
        type: spec.type,
        status: "pending",
      })
      .select("id")
      .single();
    if (assetError || !asset) throw new Error(`asset ${spec.name}: ${assetError?.message}`);

    const { data: version, error: versionError } = await admin
      .from("asset_versions")
      .insert({
        asset_id: asset.id,
        version_number: 1,
        storage_path: spec.storage_path,
        external_url: spec.external_url,
        upload_note: spec.upload_note,
        uploaded_by: userId,
      })
      .select("id")
      .single();
    if (versionError || !version)
      throw new Error(`version ${spec.name}: ${versionError?.message}`);

    const { error: patchError } = await admin
      .from("assets")
      .update({ current_version_id: version.id })
      .eq("id", asset.id);
    if (patchError) throw new Error(`asset patch ${spec.name}: ${patchError.message}`);
  }

  console.log("");
  console.log("✔ Seed complete.");
  console.log("");
  console.log(`   Login:     ${SEED_ADMIN_EMAIL}`);
  console.log(`   Password:  ${SEED_ADMIN_PASSWORD}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
