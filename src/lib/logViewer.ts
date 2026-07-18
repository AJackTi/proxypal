export interface ScrollableLogContainer {
  scrollHeight: number;
  scrollTop: number;
}

export function scrollLogContainerToLatest(container: ScrollableLogContainer | undefined): void {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}
