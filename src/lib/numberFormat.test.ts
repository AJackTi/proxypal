import { describe, expect, it } from "vitest";
import { formatCompactNumber } from "./numberFormat";

describe("formatCompactNumber", () => {
  it("uses K, M, and B suffixes for large values", () => {
    expect(formatCompactNumber(12_345)).toBe("12.3K");
    expect(formatCompactNumber(880_000_000)).toBe("880M");
    expect(formatCompactNumber(1_250_000_000)).toBe("1.25B");
  });

  it("keeps small values readable", () => {
    expect(formatCompactNumber(999)).toBe("999");
  });
});
