/** Select the newest base GPT model, preferring the plain model over variants. */
export function selectLatestGptModel(modelIds: string[]): string | null {
  const candidates = modelIds
    .map((id) => id.trim())
    .filter((id) => /^gpt-\d+(?:\.\d+)?(?:$|-)/.test(id));

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    const leftVersion = parseGptVersion(left);
    const rightVersion = parseGptVersion(right);
    if (leftVersion.major !== rightVersion.major) {
      return rightVersion.major - leftVersion.major;
    }
    if (leftVersion.minor !== rightVersion.minor) {
      return rightVersion.minor - leftVersion.minor;
    }

    // A plain model is the safest connection probe; avoid selecting fast/mini/nano variants.
    return variantRank(left) - variantRank(right);
  })[0];
}

function parseGptVersion(modelId: string): { major: number; minor: number } {
  const match = modelId.match(/^gpt-(\d+)(?:\.(\d+))?/);
  return {
    major: Number(match?.[1] ?? 0),
    minor: Number(match?.[2] ?? 0),
  };
}

function variantRank(modelId: string): number {
  if (/^gpt-\d+(?:\.\d+)?$/.test(modelId)) {
    return 0;
  }
  if (modelId.includes("-codex")) {
    return 1;
  }
  if (modelId.includes("-fast")) {
    return 2;
  }
  if (modelId.includes("-mini")) {
    return 3;
  }
  if (modelId.includes("-nano")) {
    return 4;
  }
  return 5;
}
