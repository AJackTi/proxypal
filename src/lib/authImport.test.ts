import { describe, expect, it } from "vitest";
import { detectProviderFromFilename } from "./authImport";

describe("detectProviderFromFilename", () => {
  it("recognizes ChatGPT Plus auth exports as Codex", () => {
    expect(detectProviderFromFilename("chatgpt-plus-1-auth.json")).toBe("codex");
  });

  it("keeps existing provider filename mappings", () => {
    expect(detectProviderFromFilename("gemini-account.json")).toBe("gemini");
    expect(detectProviderFromFilename("codex-account.json")).toBe("codex");
  });
});
