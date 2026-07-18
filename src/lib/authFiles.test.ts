import { describe, expect, it } from "vitest";
import { selectFilesForDownload } from "./authFiles";

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
