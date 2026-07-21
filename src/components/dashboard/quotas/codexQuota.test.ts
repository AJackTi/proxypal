import { describe, expect, it } from "vitest";
import {
  getCodexRateLimits,
  isCodexQuotaAuthUnavailable,
  isCodexQuotaExhausted,
} from "./codexQuota";

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

describe("isCodexQuotaExhausted", () => {
  it("hides an account when its primary window reaches 100%", () => {
    expect(isCodexQuotaExhausted({ ...baseAccount, primaryUsedPercent: 100 })).toBe(true);
  });

  it("hides an account when its secondary window reaches 100%", () => {
    expect(
      isCodexQuotaExhausted({
        ...baseAccount,
        secondaryUsedPercent: 100,
      }),
    ).toBe(true);
  });

  it("keeps accounts visible while all windows have remaining quota", () => {
    expect(isCodexQuotaExhausted({ ...baseAccount, primaryUsedPercent: 99.9 })).toBe(false);
  });
});

describe("isCodexQuotaAuthUnavailable", () => {
  it("filters invalidated authentication tokens from the quota widget", () => {
    expect(
      isCodexQuotaAuthUnavailable({
        ...baseAccount,
        error:
          'API error 401: {"error":{"message":"Your authentication token has been invalidated.","code":"auth_unavailable"}}',
      }),
    ).toBe(true);
  });

  it("keeps transient quota errors visible", () => {
    expect(isCodexQuotaAuthUnavailable({ ...baseAccount, error: "Request failed: timeout" })).toBe(
      false,
    );
  });
});
