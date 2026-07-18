import { describe, expect, it } from "vitest";
import { scrollLogContainerToLatest } from "./logViewer";

describe("scrollLogContainerToLatest", () => {
  it("moves the log viewport to the newest entry", () => {
    const container = { scrollHeight: 1_024, scrollTop: 0 };

    scrollLogContainerToLatest(container);

    expect(container.scrollTop).toBe(1_024);
  });

  it("does nothing before the log container is mounted", () => {
    expect(() => scrollLogContainerToLatest(undefined)).not.toThrow();
  });
});
