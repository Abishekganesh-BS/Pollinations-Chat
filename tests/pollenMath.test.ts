import { describe, it, expect } from 'vitest';
import {
  MIN_POLLEN_PER_PROMPT,
  computePollenCost,
  hasSufficientPollen,
  formatPollen,
  verifyPollenMath,
} from '../src/lib/pollenMath';

describe('pollenMath', () => {
  describe('MIN_POLLEN_PER_PROMPT', () => {
    it('equals 1/25000 = 0.00004', () => {
      expect(MIN_POLLEN_PER_PROMPT).toBeCloseTo(1 / 25000, 10);
      expect(MIN_POLLEN_PER_PROMPT).toBe(0.00004);
    });
  });

  describe('verifyPollenMath', () => {
    it('confirms 1/25000 == 0.00004', () => {
      expect(verifyPollenMath()).toBe(true);
    });
  });

  describe('computePollenCost', () => {
    it('returns MIN_POLLEN_PER_PROMPT when no pricing', () => {
      const cost = computePollenCost(null, 100, 0);
      expect(cost).toBe(MIN_POLLEN_PER_PROMPT);
    });

    it('uses pricing when available', () => {
      const pricing = {
        promptTextTokens: 0.001,
        completionTextTokens: 0.002,
      };

      const cost = computePollenCost(pricing, 500, 200);
      // 0.001 * 500 + 0.002 * 200 = 0.5 + 0.4 = 0.9
      expect(cost).toBeCloseTo(0.9, 6);
    });

    it('never returns less than MIN_POLLEN_PER_PROMPT', () => {
      const pricing = {
        promptTextTokens: 0,
        completionTextTokens: 0,
      };

      const cost = computePollenCost(pricing, 10, 5);
      expect(cost).toBeGreaterThanOrEqual(MIN_POLLEN_PER_PROMPT);
    });

    it('accounts for image completion tokens', () => {
      const pricing = {
        promptTextTokens: 0.001,
        completionImageTokens: 0.05,
      };

      const cost = computePollenCost(pricing, 100, 1);
      // 0.001 * 100 + 0.05 (per image) = 0.1 + 0.05 = 0.15
      expect(cost).toBeCloseTo(0.15, 6);
    });
  });

  describe('hasSufficientPollen', () => {
    it('returns true when balance exceeds cost', () => {
      expect(hasSufficientPollen(1.0, 0.5)).toBe(true);
    });

    it('returns true when balance equals cost', () => {
      expect(hasSufficientPollen(0.5, 0.5)).toBe(true);
    });

    it('returns false when balance is less than cost', () => {
      expect(hasSufficientPollen(0.3, 0.5)).toBe(false);
    });

    it('handles floating point near-equality', () => {
      expect(hasSufficientPollen(0.1 + 0.2, 0.3)).toBe(true);
    });
  });

  describe('formatPollen', () => {
    it('formats integer values with 2 decimals', () => {
      expect(formatPollen(5)).toBe('5.00');
    });

    it('formats small values with appropriate precision', () => {
      const formatted = formatPollen(0.00004);
      expect(formatted).toContain('0.00004');
    });

    it('formats values with up to 4 decimals for medium values', () => {
      const formatted = formatPollen(0.05);
      expect(formatted).toBe('0.0500');
    });
  });
});
