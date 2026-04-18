import { describe, expect, it } from "vitest";
import { buildStoragePath } from "@/lib/supabase/storage";

describe("buildStoragePath", () => {
  it("lays out {workspace}/{asset}/{version}/{filename}", () => {
    const path = buildStoragePath({
      workspace_id: "ws-1",
      asset_id: "asset-1",
      version_id: "ver-1",
      filename: "hero.png",
    });
    expect(path).toBe("ws-1/asset-1/ver-1/hero.png");
  });

  it("sanitizes filename characters that could break storage or RLS", () => {
    const path = buildStoragePath({
      workspace_id: "ws-1",
      asset_id: "asset-1",
      version_id: "ver-1",
      filename: "evil name with spaces & ../slashes.png",
    });
    // Filename segment: only [a-zA-Z0-9._-] survive. Crucially, no extra
    // slashes leak into the last segment — that would break the RLS path
    // contract (workspace_id must remain the first segment).
    const segments = path.split("/");
    expect(segments).toHaveLength(4);
    expect(segments[0]).toBe("ws-1");
    expect(segments[3]).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(path.endsWith(".png")).toBe(true);
    expect(path).not.toContain(" ");
  });

  it("keeps workspace_id as the FIRST segment (RLS requirement)", () => {
    const path = buildStoragePath({
      workspace_id: "abc",
      asset_id: "def",
      version_id: "ghi",
      filename: "jkl.png",
    });
    expect(path.split("/")[0]).toBe("abc");
  });
});
