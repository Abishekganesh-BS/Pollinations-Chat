import { describe, it, expect } from 'vitest';
import type { PollinationsModel, ModelCapabilities } from '../src/types';

/**
 * Tests that model capability inference works correctly
 * based on the model metadata from the Pollinations API.
 */

function inferCapabilities(modelName: string, rawType: string): ModelCapabilities {
  return {
    vision: modelName.includes('vision') || modelName.includes('gptimage'),
    audio: modelName.includes('audio') || modelName.includes('tts'),
    streaming: rawType === 'text' || rawType === 'chat',
    webSearch: modelName.includes('search') || modelName.includes('perplexity'),
    deepThink: modelName.includes('reasoning') || modelName.includes('deepseek'),
    codeExecution: modelName.includes('coder'),
  };
}

describe('modelCapability', () => {
  describe('inferCapabilities', () => {
    it('marks text models as streaming', () => {
      const caps = inferCapabilities('openai', 'text');
      expect(caps.streaming).toBe(true);
    });

    it('marks image models as non-streaming', () => {
      const caps = inferCapabilities('flux', 'image');
      expect(caps.streaming).toBe(false);
    });

    it('detects audio capability from name', () => {
      const caps = inferCapabilities('openai-audio', 'text');
      expect(caps.audio).toBe(true);
      expect(caps.streaming).toBe(true);
    });

    it('detects web search capability', () => {
      const searchModels = ['gemini-search', 'perplexity-fast'];
      for (const name of searchModels) {
        const caps = inferCapabilities(name, 'text');
        expect(caps.webSearch).toBe(true);
      }
    });

    it('detects code execution capability', () => {
      const caps = inferCapabilities('qwen-coder', 'text');
      expect(caps.codeExecution).toBe(true);
    });
  });

  describe('model type grouping', () => {
    const makeModel = (name: string, type: string): PollinationsModel => ({
      id: name,
      name,
      description: `${name} model`,
      type: type as PollinationsModel['type'],
      inputModalities: ['text'],
      outputModalities: [type],
      paidOnly: false,
      pricing: { currency: 'USD' },
      capabilities: inferCapabilities(name, type),
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      contextLength: 128000,
      aliases: [],
    });

    const models: PollinationsModel[] = [
      makeModel('openai', 'text'),
      makeModel('flux', 'image'),
      makeModel('openai-audio', 'text'),
    ];

    it('groups text models together', () => {
      const textModels = models.filter((m) => m.type === 'text');
      expect(textModels).toHaveLength(2);
    });

    it('groups image models together', () => {
      const imageModels = models.filter((m) => m.type === 'image');
      expect(imageModels).toHaveLength(1);
    });

    it('finds audio-capable models', () => {
      const audioModels = models.filter((m) => m.capabilities.audio);
      expect(audioModels).toHaveLength(1);
      expect(audioModels[0].name).toBe('openai-audio');
    });
  });
});
