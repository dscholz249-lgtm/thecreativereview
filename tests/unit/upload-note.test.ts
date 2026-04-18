import { describe, expect, it } from "vitest";
import {
  sanitizeUploadNote,
  OptionalUploadNoteSchema,
} from "@/lib/domain/upload-note";

describe("sanitizeUploadNote", () => {
  it("returns null for null/undefined", () => {
    expect(sanitizeUploadNote(null)).toBeNull();
    expect(sanitizeUploadNote(undefined)).toBeNull();
  });

  it("strips HTML tags", () => {
    expect(sanitizeUploadNote("<b>bold</b> and <i>italic</i>")).toBe(
      "bold and italic",
    );
    expect(
      sanitizeUploadNote("<script>alert('x')</script>Please focus on color"),
    ).toBe("alert('x')Please focus on color");
  });

  it("strips HTML comments", () => {
    expect(sanitizeUploadNote("hi <!-- secret --> there")).toBe("hi there");
  });

  it("normalizes whitespace", () => {
    expect(sanitizeUploadNote("  hi\t\t\nthere   ")).toBe("hi there");
    expect(sanitizeUploadNote("a\n\n\nb")).toBe("a b");
  });

  it("returns null for empty-after-sanitize", () => {
    expect(sanitizeUploadNote("   ")).toBeNull();
    expect(sanitizeUploadNote("<p></p>")).toBeNull();
  });

  it("preserves plain text exactly", () => {
    expect(
      sanitizeUploadNote("Please focus on the color palette — logo is locked."),
    ).toBe("Please focus on the color palette — logo is locked.");
  });
});

describe("OptionalUploadNoteSchema", () => {
  it("accepts valid input and sanitizes", () => {
    const r = OptionalUploadNoteSchema.safeParse("<p>hi</p>");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("hi");
  });

  it("accepts null/undefined", () => {
    expect(OptionalUploadNoteSchema.parse(null)).toBeNull();
    expect(OptionalUploadNoteSchema.parse(undefined)).toBeNull();
  });
});
