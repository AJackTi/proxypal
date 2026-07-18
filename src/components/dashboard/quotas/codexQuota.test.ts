import { describe, expect, it } from "vitest";
import { getCodexRateLimits } from "./codexQuota";

import type { CodexQuotaResult } from "../../../lib/tauri";

const baseAccount: CodexQuotaResult = {
  accountEmail: "codex@example.com",
  accountKey: "codex-codex@example.com.json",
  creditsUnlimited: false,
  fetchedAt: "2026-07-18T00:00:00Z",
  hasCredits: false,
  planType: "plus",
  primaryResetAt: 1_752_800_000,
  primaryUsedPercent: 10,
};

describe("getCodexRateLimits", () => {
  it("shows only the primary limit when the API omits the secondary window", () => {
    expect(getCodexRateLimits(baseAccount)).toEqual([
      {
        labelKey: "primaryLimit3h",
        resetAt: baseAccount.primaryResetAt,
        usedPercent: 10,
      },
    ]);
  });

  it("keeps supporting two bars when the API returns the secondary window", () => {
    expect(
      getCodexRateLimits({
        ...baseAccount,
        secondaryResetAt: 1_753_000_000,
        secondaryUsedPercent: 25,
      }),
    ).toEqual([
      {
        labelKey: "primaryLimit3h",
        resetAt: baseAccount.primaryResetAt,
        usedPercent: 10,
      },
      {
        labelKey: "weeklyLimit",
        resetAt: 1_753_000_000,
        usedPercent: 25,
      },
    ]);
  });
});
