import { describe, expect, it } from "vitest";
import { isAuthFileAutoCollapsed, selectFilesForDownload } from "./authFiles";

import type { AuthFile } from "./tauri/auth-files";

const files = [
  { id: "one", name: "one.json" },
  { id: "two", name: "two.json" },
] as AuthFile[];

describe("selectFilesForDownload", () => {
  it("returns only selected files", () => {
    expect(selectFilesForDownload(files, new Set(["two"]))).toEqual([files[1]]);
  });

  it("returns all files when there is no selection", () => {
    expect(selectFilesForDownload(files, new Set())).toEqual(files);
  });
});

describe("isAuthFileAutoCollapsed", () => {
  it("collapses unavailable auth files", () => {
    expect(isAuthFileAutoCollapsed({ ...files[0], unavailable: true })).toBe(true);
  });

  it("keeps usable auth files expandable", () => {
    expect(isAuthFileAutoCollapsed({ ...files[0], disabled: false, unavailable: false })).toBe(
      false,
    );
  });
});
