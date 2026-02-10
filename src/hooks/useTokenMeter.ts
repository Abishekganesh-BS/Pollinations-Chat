/**
 * Hook: live token meter — tracks estimated token usage for the composer.
 */

import { useState, useCallback, useMemo } from 'react';
import { estimateTokens, estimateMessagesTokens } from '../lib/tokenizer';
import type { ChatMessage } from '../types';

export function useTokenMeter(
  history: ChatMessage[],
  maxInputTokens: number,
  systemPrompt: string,
) {
  const [composerText, setComposerText] = useState('');

  const historyTokens = useMemo(() => {
    const msgs = history.map((m) => ({ role: m.role, content: m.content }));
    return estimateMessagesTokens(msgs);
  }, [history]);

  const systemTokens = useMemo(
    () => (systemPrompt ? estimateTokens(systemPrompt) + 4 : 0),
    [systemPrompt],
  );

  const composerTokens = useMemo(
    () => estimateTokens(composerText) + 4, // +4 for role/formatting
    [composerText],
  );

  const totalInputTokens = historyTokens + systemTokens + composerTokens;
  const isOverLimit = totalInputTokens > maxInputTokens;
  const usageRatio = maxInputTokens > 0 ? totalInputTokens / maxInputTokens : 0;

  const updateComposerText = useCallback((text: string) => {
    setComposerText(text);
  }, []);

  return {
    composerText,
    composerTokens,
    historyTokens,
    systemTokens,
    totalInputTokens,
    maxInputTokens,
    isOverLimit,
    usageRatio,
    updateComposerText,
  };
}
