import { describe, expect, it } from "vitest";
import {
  filterCodexQuotaAccounts,
  getCodexBankResetAt,
  getCodexRateLimits,
  isCodexQuotaExhausted,
  isCodexQuotaInvalidated,
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

describe("getCodexBankResetAt", () => {
  it("uses the next future reset window for bank reset", () => {
    expect(
      getCodexBankResetAt(
        {
          ...baseAccount,
          primaryResetAt: 1_752_800_000,
          secondaryResetAt: 1_753_000_000,
          secondaryUsedPercent: 25,
        },
        1_752_700_000,
      ),
    ).toBe(1_752_800_000);
  });

  it("ignores reset windows that have already passed", () => {
    expect(getCodexBankResetAt(baseAccount, 1_752_900_000)).toBeUndefined();
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

describe("isCodexQuotaInvalidated", () => {
  it("excludes token-invalidated API responses from quota", () => {
    expect(
      isCodexQuotaInvalidated({
        ...baseAccount,
        error:
          'API error 401 Unauthorized: {"error":{"message":"Your authentication token has been invalidated. Please try signing in again.","type":"invalid_request_error","code":"token_invalidated"}}',
      }),
    ).toBe(true);
  });

  it("keeps other API errors visible", () => {
    expect(
      isCodexQuotaInvalidated({
        ...baseAccount,
        error: "API error 500 Internal Server Error",
      }),
    ).toBe(false);
  });

  it("removes invalidated accounts from the quota collection", () => {
    const invalidatedAccount = {
      ...baseAccount,
      accountKey: "invalidated.json",
      error: 'API error 401: {"code":"token_invalidated"}',
    };

    expect(filterCodexQuotaAccounts([baseAccount, invalidatedAccount])).toEqual([baseAccount]);
  });
});
