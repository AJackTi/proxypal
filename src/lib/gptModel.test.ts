import { describe, expect, it } from "vitest";
import { selectLatestGptModel } from "./gptModel";

describe("selectLatestGptModel", () => {
  it("selects the newest plain GPT version", () => {
    expect(selectLatestGptModel(["gpt-5.1-codex-mini", "gpt-5.4", "gpt-5.5-fast", "gpt-5.5"])).toBe(
      "gpt-5.5",
    );
  });

  it("returns null when no GPT models are available", () => {
    expect(selectLatestGptModel(["claude-sonnet-4-5", "gemini-2.5-flash"])).toBeNull();
  });
});
