import { describe, expect, it } from "vitest";
import { calculateSuccessRate, clampPercentage } from "./analytics";

describe("analytics percentages", () => {
  it("clamps inconsistent success counters to 100 percent", () => {
    expect(calculateSuccessRate(19_697, 19_587)).toBe(100);
  });

  it("keeps gauge values inside the supported range", () => {
    expect(clampPercentage(101)).toBe(100);
    expect(clampPercentage(-1)).toBe(0);
  });

  it("treats an empty dataset as fully healthy", () => {
    expect(calculateSuccessRate(0, 0)).toBe(100);
  });
});
