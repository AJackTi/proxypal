/**
 * Return the most recent entries in display order without mutating the source.
 * The log source is chronological (oldest first), while the viewer presents
 * newest entries first so refreshes naturally keep the useful content at top.
 */
export function getLatestLogsForDisplay<T>(logs: T[], limit: number): T[] {
  if (limit <= 0) {
    return [];
  }

  return logs.slice(-limit).reverse();
}

export interface ScrollableLogContainer {
  scrollTop: number;
}

export function scrollLogContainerToNewest(container: ScrollableLogContainer | undefined): void {
  if (container) {
    container.scrollTop = 0;
  }
}
