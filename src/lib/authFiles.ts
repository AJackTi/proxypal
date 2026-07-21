import type { AuthFile } from "./tauri/auth-files";

export function isAuthFileAutoCollapsed(file: Pick<AuthFile, "disabled" | "unavailable">): boolean {
  return file.disabled || file.unavailable;
}

/**
 * Download selected files when a selection exists; otherwise download the full
 * auth-file list.
 */
export function selectFilesForDownload(
  files: AuthFile[],
  selectedIds: ReadonlySet<string>,
): AuthFile[] {
  if (selectedIds.size === 0) {
    return files;
  }

  return files.filter((file) => selectedIds.has(file.id));
}
