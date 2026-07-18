import type { KiroQuotaResult } from "../../../lib/tauri";

export function countKiroAccounts(quotaData: KiroQuotaResult[]): number {
  return quotaData.filter((quota) => !quota.error).length;
}
