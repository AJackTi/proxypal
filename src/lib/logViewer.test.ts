import { describe, expect, it } from "vitest";
import { getLatestLogsForDisplay, scrollLogContainerToNewest } from "./logViewer";

describe("getLatestLogsForDisplay", () => {
  it("returns the newest entries first without mutating the source", () => {
    const logs = ["oldest", "middle", "newest"];

    expect(getLatestLogsForDisplay(logs, 2)).toEqual(["newest", "middle"]);
    expect(logs).toEqual(["oldest", "middle", "newest"]);
  });

  it("returns all entries newest-first when the limit is larger", () => {
    expect(getLatestLogsForDisplay(["oldest", "newest"], 10)).toEqual(["newest", "oldest"]);
  });
});

describe("scrollLogContainerToNewest", () => {
  it("moves the viewport to the newest entry at the top", () => {
    const container = { scrollTop: 1024 };

    scrollLogContainerToNewest(container);

    expect(container.scrollTop).toBe(0);
  });

  it("does nothing before the log container is mounted", () => {
    expect(() => scrollLogContainerToNewest(undefined)).not.toThrow();
  });
});
