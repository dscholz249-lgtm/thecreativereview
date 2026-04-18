import { describe, expect, it } from "vitest";
import { CreateClientSchema } from "@/lib/domain/client";
import { CreateProjectSchema } from "@/lib/domain/project";
import { CreateAssetSchema, CreateVersionSchema } from "@/lib/domain/asset";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("CreateClientSchema", () => {
  it("accepts a valid client", () => {
    const r = CreateClientSchema.safeParse({
      name: "Acme",
      primary_email: "ops@acme.test",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = CreateClientSchema.safeParse({
      name: "   ",
      primary_email: "ops@acme.test",
    });
    expect(r.success).toBe(false);
  });

  it("rejects malformed email", () => {
    const r = CreateClientSchema.safeParse({
      name: "Acme",
      primary_email: "not-an-email",
    });
    expect(r.success).toBe(false);
  });
});

describe("CreateProjectSchema", () => {
  it("accepts valid project", () => {
    const r = CreateProjectSchema.safeParse({
      client_id: UUID,
      name: "Spring campaign",
      description: "",
      deadline: "2026-05-15",
    });
    expect(r.success).toBe(true);
  });

  it("rejects non-UUID client_id", () => {
    const r = CreateProjectSchema.safeParse({
      client_id: "abc",
      name: "x",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-YYYY-MM-DD deadline", () => {
    const r = CreateProjectSchema.safeParse({
      client_id: UUID,
      name: "x",
      deadline: "5/15/2026",
    });
    expect(r.success).toBe(false);
  });
});

describe("CreateAssetSchema", () => {
  it("accepts each valid type", () => {
    for (const t of ["image", "document", "design", "wireframe"]) {
      const r = CreateAssetSchema.safeParse({
        project_id: UUID,
        name: "hero.png",
        type: t,
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects unknown type", () => {
    const r = CreateAssetSchema.safeParse({
      project_id: UUID,
      name: "x",
      type: "video",
    });
    expect(r.success).toBe(false);
  });
});

describe("CreateVersionSchema", () => {
  it("requires exactly one of storage_path or external_url", () => {
    const neither = CreateVersionSchema.safeParse({ asset_id: UUID });
    expect(neither.success).toBe(false);

    const both = CreateVersionSchema.safeParse({
      asset_id: UUID,
      storage_path: "x/y/z.png",
      external_url: "https://figma.com/x",
    });
    expect(both.success).toBe(false);

    const justPath = CreateVersionSchema.safeParse({
      asset_id: UUID,
      storage_path: "x/y/z.png",
    });
    expect(justPath.success).toBe(true);

    const justUrl = CreateVersionSchema.safeParse({
      asset_id: UUID,
      external_url: "https://figma.com/x",
    });
    expect(justUrl.success).toBe(true);
  });
});
