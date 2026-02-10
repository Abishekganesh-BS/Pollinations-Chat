/**
 * Pollen Math — precise calculations for pollen cost enforcement.
 *
 * Base: 1 pollen = 25,000 prompts on the cheapest model
 * → pollen per prompt = 1 / 25000 = 0.00004
 *
 * All comparisons use a tiny epsilon for float rounding.
 */

/** Minimum pollen cost for a single prompt on the cheapest model */
export const MIN_POLLEN_PER_PROMPT = 0.00004; // 1 / 25000

/** Float comparison epsilon */
const EPSILON = 1e-10;

/**
 * Compute pollen cost for a generation request.
 *
 * If model pricing metadata is available, uses that.
 * Otherwise falls back to MIN_POLLEN_PER_PROMPT.
 *
 * @param pricing - pricing info from model metadata
 * @param inputTokens - estimated input tokens
 * @param outputTokens - estimated output tokens (or 1 for images)
 */
export function computePollenCost(
  pricing: {
    promptTextTokens?: number;
    promptAudioTokens?: number;
    completionTextTokens?: number;
    completionImageTokens?: number;
    completionVideoSeconds?: number;
    completionVideoTokens?: number;
    completionAudioSeconds?: number;
    completionAudioTokens?: number;
  } | null | undefined,
  inputTokens = 100,
  outputTokens = 500,
): number {
  if (!pricing) return MIN_POLLEN_PER_PROMPT;

  let cost = 0;

  // Input cost
  if (pricing.promptTextTokens) {
    cost += pricing.promptTextTokens * inputTokens;
  }
  if (pricing.promptAudioTokens) {
    cost += pricing.promptAudioTokens * inputTokens;
  }

  // Output cost — use whichever applies
  if (pricing.completionTextTokens) {
    cost += pricing.completionTextTokens * outputTokens;
  } else if (pricing.completionImageTokens) {
    cost += pricing.completionImageTokens; // per image
  } else if (pricing.completionVideoSeconds) {
    cost += pricing.completionVideoSeconds * 5; // estimate 5 seconds
  } else if (pricing.completionVideoTokens) {
    cost += pricing.completionVideoTokens * outputTokens;
  } else if (pricing.completionAudioTokens) {
    cost += pricing.completionAudioTokens * outputTokens;
  } else if (pricing.completionAudioSeconds) {
    cost += pricing.completionAudioSeconds * 10; // estimate 10 seconds
  }

  // Ensure at least minimum cost
  return Math.max(cost, MIN_POLLEN_PER_PROMPT);
}

/**
 * Check if the user has sufficient pollen balance for a request.
 * Uses epsilon to handle float rounding.
 */
export function hasSufficientPollen(
  balance: number,
  requiredPollen: number,
): boolean {
  return balance + EPSILON >= requiredPollen;
}

/**
 * Format pollen value for display — show up to 5 decimal places.
 */
export function formatPollen(value: number): string {
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(5);
}

/**
 * Compute the math example for verification:
 * 1 / 25000 = 0.00004
 */
export function verifyPollenMath(): boolean {
  const result = 1 / 25000;
  // Verify digit-by-digit: 0.00004
  return Math.abs(result - 0.00004) < EPSILON;
}
