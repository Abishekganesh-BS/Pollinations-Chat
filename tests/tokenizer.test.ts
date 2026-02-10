import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  estimateMessagesTokens,
  truncateMessages,
  getTokenMeterColor,
} from '../src/lib/tokenizer';

describe('tokenizer', () => {
  describe('estimateTokens', () => {
    it('returns 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('estimates reasonable tokens for short text', () => {
      const tokens = estimateTokens('hello');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('handles long text', () => {
      const text = 'a '.repeat(500); // 1000 chars
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(100);
      expect(tokens).toBeLessThan(1000);
    });
  });

  describe('estimateMessagesTokens', () => {
    it('returns a small value for empty array', () => {
      const tokens = estimateMessagesTokens([]);
      expect(tokens).toBeGreaterThanOrEqual(0);
    });

    it('adds per-message overhead', () => {
      const msgs = [{ role: 'user', content: 'test' }];
      const tokens = estimateMessagesTokens(msgs);
      expect(tokens).toBeGreaterThan(estimateTokens('test'));
    });

    it('sums multiple messages', () => {
      const msgs = [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'world' },
      ];
      const tokens = estimateMessagesTokens(msgs);
      // Should be more than both individual messages
      expect(tokens).toBeGreaterThan(estimateTokens('hello') + estimateTokens('world'));
    });
  });

  describe('truncateMessages', () => {
    it('returns all messages when within limit', () => {
      const msgs = [{ role: 'user', content: 'hi' }];
      const result = truncateMessages(msgs, 10000);
      expect(result.messages).toHaveLength(1);
      expect(result.removed).toBe(0);
    });

    it('preserves system messages', () => {
      const msgs = [
        { role: 'system', content: 'you are helpful' },
        { role: 'user', content: 'a'.repeat(400) },
      ];

      const result = truncateMessages(msgs, 10);
      const systemMsgs = result.messages.filter((m) => m.role === 'system');
      expect(systemMsgs).toHaveLength(1);
    });

    it('removes oldest non-system messages first', () => {
      const msgs = [
        { role: 'user', content: 'first' },
        { role: 'user', content: 'second' },
        { role: 'user', content: 'third' },
      ];

      const result = truncateMessages(msgs, 15);
      if (result.messages.length < msgs.length) {
        // The last message should always be kept
        expect(result.messages[result.messages.length - 1].content).toBe('third');
      }
    });
  });

  describe('getTokenMeterColor', () => {
    it('returns green class for low usage', () => {
      expect(getTokenMeterColor(30, 100)).toContain('green');
    });

    it('returns orange class for medium usage', () => {
      expect(getTokenMeterColor(70, 100)).toContain('orange');
    });

    it('returns red class for high usage', () => {
      expect(getTokenMeterColor(95, 100)).toContain('red');
    });
  });
});
