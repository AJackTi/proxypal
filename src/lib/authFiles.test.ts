import { describe, expect, it } from "vitest";
import {
  isAuthFileExpansionDisabled,
  selectFilesForDownload,
  shouldAuthFileStartCollapsed,
  summarizeAuthConnectionTests,
} from "./authFiles";

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

describe("auth file collapsing", () => {
  it("starts invalidated tokens collapsed but keeps them expandable", () => {
    const file = {
      ...files[0],
      disabled: false,
      statusMessage: "authentication token has been invalidated",
      unavailable: true,
    };

    expect(shouldAuthFileStartCollapsed(file)).toBe(true);
    expect(isAuthFileExpansionDisabled(file)).toBe(false);
  });

  it("does not collapse unrelated unavailable errors", () => {
    const file = {
      ...files[0],
      disabled: false,
      statusMessage: "temporary upstream connection error",
      unavailable: true,
    };

    expect(shouldAuthFileStartCollapsed(file)).toBe(false);
    expect(isAuthFileExpansionDisabled(file)).toBe(false);
  });

  it("keeps disabled auth files collapsed and non-expandable", () => {
    const file = { ...files[0], disabled: true, unavailable: false };
    expect(shouldAuthFileStartCollapsed(file)).toBe(true);
    expect(isAuthFileExpansionDisabled(file)).toBe(true);
  });
});

describe("summarizeAuthConnectionTests", () => {
  it("counts passed, failed and skipped auth entries", () => {
    expect(
      summarizeAuthConnectionTests([
        { message: "ok", status: "passed" },
        { message: "bad", status: "failed" },
        { message: "disabled", status: "skipped" },
      ]),
    ).toEqual({ failed: 1, passed: 1, skipped: 1 });
  });
});
