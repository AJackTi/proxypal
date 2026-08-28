export function detectProviderFromFilename(filename: string): string {
  const normalized = filename.toLowerCase();
  if (normalized.includes("gemini")) {
    return "gemini";
  }
  if (normalized.includes("codex") || normalized.includes("chatgpt")) {
    return "codex";
  }
  if (normalized.includes("qwen")) {
    return "qwen";
  }
  if (normalized.includes("iflow")) {
    return "iflow";
  }
  if (normalized.includes("vertex")) {
    return "vertex";
  }
  if (normalized.includes("kiro")) {
    return "kiro";
  }
  if (normalized.includes("antigravity")) {
    return "antigravity";
  }
  if (normalized.includes("kimi")) {
    return "kimi";
  }
  if (normalized.includes("deepseek")) {
    return "deepseek";
  }
  return "claude";
}
