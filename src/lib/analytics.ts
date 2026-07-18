export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function calculateSuccessRate(successCount: number, totalRequests: number): number {
  if (totalRequests <= 0) {
    return 100;
  }
  return Math.round(clampPercentage((successCount / totalRequests) * 100));
}
