import type { CodexQuotaResult } from "../../../lib/tauri";

export interface CodexRateLimit {
  labelKey: "primaryLimit3h" | "weeklyLimit";
  resetAt?: number;
  usedPercent: number;
}

export function getCodexRateLimits(account: CodexQuotaResult): CodexRateLimit[] {
  const limits: CodexRateLimit[] = [
    {
      labelKey: "primaryLimit3h",
      resetAt: account.primaryResetAt,
      usedPercent: account.primaryUsedPercent,
    },
  ];

  if (typeof account.secondaryUsedPercent === "number") {
    limits.push({
      labelKey: "weeklyLimit",
      resetAt: account.secondaryResetAt,
      usedPercent: account.secondaryUsedPercent,
    });
  }

  return limits;
}

/** An account is unavailable once any of its active quota windows is exhausted. */
export function isCodexQuotaExhausted(account: CodexQuotaResult): boolean {
  return getCodexRateLimits(account).some((limit) => limit.usedPercent >= 100);
}

/** Invalidated credentials cannot provide quota and should not appear in this widget. */
export function isCodexQuotaInvalidated(account: CodexQuotaResult): boolean {
  const error = account.error?.toLowerCase();
  if (!error) {
    return false;
  }

  return (
    error.includes("token_invalidated") ||
    error.includes("authentication token has been invalidated")
  );
}

export function filterCodexQuotaAccounts(accounts: CodexQuotaResult[]): CodexQuotaResult[] {
  return accounts.filter((account) => !isCodexQuotaInvalidated(account));
}
