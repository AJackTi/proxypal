export function formatCompactNumber(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${trimDecimal(value / 1_000_000_000, 2)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000, 2)}M`;
  }
  if (absolute >= 1000) {
    return `${trimDecimal(value / 1000, 1)}K`;
  }
  return Math.round(value).toLocaleString();
}

function trimDecimal(value: number, precision: number): string {
  return value.toFixed(precision).replace(/\.0+$|(?<=\.[0-9])0+$/, "");
}
