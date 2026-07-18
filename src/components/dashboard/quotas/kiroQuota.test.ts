import { describe, expect, it } from "vitest";
import { countKiroAccounts } from "./kiroQuota";

import type { KiroQuotaResult } from "../../../lib/tauri";

const quotaResult: KiroQuotaResult = {
  accountEmail: "Kiro Account",
  bonusCreditsTotal: 0,
  bonusCreditsUsed: 0,
  fetchedAt: "2026-07-18T00:00:00Z",
  plan: "KIRO PRO",
  totalCredits: 50,
  usedCredits: 10,
  usedPercent: 20,
};

describe("countKiroAccounts", () => {
  it("does not count CLI error placeholders as accounts", () => {
    expect(
      countKiroAccounts([
        {
          ...quotaResult,
          accountEmail: "Kiro Subscription",
          error: "kiro-cli not found",
          plan: "CLI Not Found",
          totalCredits: 0,
          usedCredits: 0,
          usedPercent: 0,
        },
      ]),
    ).toBe(0);
  });

  it("counts successful quota responses", () => {
    expect(countKiroAccounts([quotaResult])).toBe(1);
  });
});
