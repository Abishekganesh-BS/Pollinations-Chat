/**
 * Client-side tokenizer using heuristic estimation.
 *
 * For accurate counts we'd use tiktoken, but it's heavy in the browser.
 * This heuristic is within ~10% of GPT tokenizers for English text.
 * The server reports exact counts after generation, which we display.
 */

/**
 * Estimate token count for a string.
 * Heuristic: ~4 characters per token for English, adjusting for code/whitespace.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Count words — each word is roughly 1.3 tokens on average
  const words = text.split(/\s+/).filter(Boolean);
  const wordTokens = words.length * 1.3;

  // Count special characters/punctuation — each is roughly 1 token
  const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) ?? []).length;

  // Rough estimate combining both heuristics
  const estimate = Math.ceil(wordTokens + specialChars * 0.5);

  // Fallback: use character-based estimate and take the higher
  const charEstimate = Math.ceil(text.length / 4);

  return Math.max(estimate, charEstimate, 1);
}

/**
 * Estimate tokens for a full chat messages array (role + content).
 * Each message adds ~4 tokens overhead for role/formatting.
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  let total = 0;
  for (const msg of messages) {
    total += 4; // role + formatting overhead
    total += estimateTokens(msg.content);
  }
  total += 2; // priming tokens
  return total;
}

/**
 * Truncate messages array to fit within a token limit.
 * Removes oldest messages (index 1+, keeping system prompt at index 0 if present)
 * until total tokens <= maxTokens.
 *
 * Returns { messages, removed } where removed is the count of dropped messages.
 */
export function truncateMessages(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): { messages: Array<{ role: string; content: string }>; removed: number } {
  if (messages.length === 0) return { messages: [], removed: 0 };

  let current = [...messages];
  let removed = 0;

  while (estimateMessagesTokens(current) > maxTokens && current.length > 1) {
    // Keep index 0 (system prompt) and the last message (user's new message)
    // Remove the oldest non-system message
    const removeIdx = current[0].role === 'system' ? 1 : 0;
    current.splice(removeIdx, 1);
    removed++;
  }

  return { messages: current, removed };
}

/**
 * Get a color for the token meter based on usage ratio.
 */
export function getTokenMeterColor(used: number, limit: number): string {
  if (limit === 0) return 'text-gray-500';
  const ratio = used / limit;
  if (ratio < 0.6) return 'text-green-500';
  if (ratio < 0.85) return 'text-orange-500';
  return 'text-red-500';
}
