import type { AuthConnectionTestResult, AuthFile } from "./tauri/auth-files";

export interface AuthConnectionTestSummary {
  failed: number;
  passed: number;
  skipped: number;
}

export function shouldAuthFileStartCollapsed(
  file: Pick<AuthFile, "disabled" | "statusMessage">,
): boolean {
  const statusMessage = file.statusMessage?.toLowerCase() ?? "";
  return file.disabled || statusMessage.includes("authentication token has been invalidated");
}

export function isAuthFileExpansionDisabled(file: Pick<AuthFile, "disabled">): boolean {
  return file.disabled;
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

export function summarizeAuthConnectionTests(
  results: Iterable<AuthConnectionTestResult>,
): AuthConnectionTestSummary {
  const summary = { failed: 0, passed: 0, skipped: 0 };
  for (const result of results) {
    summary[result.status]++;
  }
  return summary;
}
