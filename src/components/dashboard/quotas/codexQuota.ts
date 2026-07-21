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

export function isCodexQuotaAuthUnavailable(account: CodexQuotaResult): boolean {
  const error = account.error?.toLowerCase() ?? "";
  return (
    error.includes("auth_unavailable") ||
    error.includes("authentication token has been invalidated")
  );
}
