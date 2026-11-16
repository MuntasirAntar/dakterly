import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("accepts same-site paths", () => {
    expect(safeNextPath("/doctors/d1/book?date=2026-11-20&slot=17:10")).toBe("/doctors/d1/book?date=2026-11-20&slot=17:10");
    expect(safeNextPath("/appointments")).toBe("/appointments");
  });

  it("rejects other sites and tricks", () => {
    for (const bad of ["//evil.com", "https://evil.com", "http://evil.com/x", "/\\evil.com", "javascript:alert(1)", "evil.com", "", "/a\nb"]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });

  it("rejects non-strings and very long values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(123)).toBeNull();
    expect(safeNextPath("/" + "a".repeat(400))).toBeNull();
  });
});
