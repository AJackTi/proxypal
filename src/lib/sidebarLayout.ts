export function isSidebarWide(
  pinned: boolean | null | undefined,
  expanded: boolean | null | undefined,
): boolean {
  return Boolean(pinned || expanded);
}
