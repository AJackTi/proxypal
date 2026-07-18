import type { KiroQuotaResult } from "../../../lib/tauri";

export function countKiroAccounts(quotaData: KiroQuotaResult[]): number {
  return quotaData.filter((quota) => {
    if (quota.error) {
      return false;
    }

    // kiro-cli can exit successfully while showing a signed-out/empty usage screen.
    // That response has no parsed plan or credits and is not an account.
    return quota.plan !== "Unknown" || quota.totalCredits > 0 || quota.bonusCreditsTotal > 0;
  }).length;
}
