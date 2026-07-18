import { describe, expect, it } from "vitest";
import { isSidebarWide } from "./sidebarLayout";

describe("isSidebarWide", () => {
  it("keeps content aligned when a persisted pin loads before hover state", () => {
    expect(isSidebarWide(true, false)).toBe(true);
    expect(isSidebarWide(true, null)).toBe(true);
  });

  it("uses hover expansion for an unpinned sidebar", () => {
    expect(isSidebarWide(false, true)).toBe(true);
    expect(isSidebarWide(false, false)).toBe(false);
  });
});
