import { describe, it, expect } from 'vitest';
import {
  exportJSON,
  exportMarkdown,
  importJSON,
  importMarkdown,
} from '../src/lib/exportImport';
import type { ChatSession, ChatMessage } from '../src/types';

function makeSession(title: string, messages: ChatMessage[]): ChatSession {
  return {
    id: `session-${Math.random()}`,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages,
    model: 'openai',
    totalPollenSpent: 0,
  };
}

function makeMsg(
  content: string,
  role: 'user' | 'assistant' | 'system' = 'user',
): ChatMessage {
  return {
    id: `msg-${Math.random()}`,
    role,
    content,
    timestamp: Date.now(),
    mode: 'text',
    model: 'openai',
    attachments: [],
  };
}

describe('exportImport', () => {
  describe('exportJSON / importJSON roundtrip', () => {
    it('exports and re-imports sessions without data loss', () => {
      const sessions: ChatSession[] = [
        makeSession('Chat 1', [
          makeMsg('Hello', 'user'),
          makeMsg('Hi there!', 'assistant'),
        ]),
        makeSession('Chat 2', [
          makeMsg('How are you?', 'user'),
        ]),
      ];

      const json = exportJSON(sessions);
      const imported = importJSON(json);

      expect(imported).toHaveLength(2);
      expect(imported[0].title).toBe('Chat 1');
      expect(imported[0].messages).toHaveLength(2);
      expect(imported[0].messages[0].content).toBe('Hello');
      expect(imported[0].messages[1].content).toBe('Hi there!');
      expect(imported[1].title).toBe('Chat 2');
      expect(imported[1].messages).toHaveLength(1);
    });

    it('includes version and exportedAt in JSON', () => {
      const json = exportJSON([]);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.exportedAt).toBeDefined();
    });
  });

  describe('importJSON validation', () => {
    it('throws on invalid JSON', () => {
      expect(() => importJSON('not json')).toThrow();
    });

    it('throws when sessions is not an array', () => {
      expect(() => importJSON('{"sessions": "nope"}')).toThrow();
    });

    it('handles export with empty sessions', () => {
      const json = exportJSON([]);
      const imported = importJSON(json);
      expect(imported).toHaveLength(0);
    });
  });

  describe('exportMarkdown', () => {
    it('includes session title as heading', () => {
      const sessions = [
        makeSession('My Chat', [makeMsg('Hello', 'user')]),
      ];
      const md = exportMarkdown(sessions);
      expect(md).toContain('# My Chat');
    });

    it('labels user and assistant messages', () => {
      const sessions = [
        makeSession('Test', [
          makeMsg('Question', 'user'),
          makeMsg('Answer', 'assistant'),
        ]),
      ];
      const md = exportMarkdown(sessions);
      expect(md).toContain('**You**');
      expect(md).toContain('**Assistant**');
      expect(md).toContain('Question');
      expect(md).toContain('Answer');
    });
  });

  describe('importMarkdown', () => {
    it('parses a markdown export with correct heading format', () => {
      const md = `# Pollinations Chat Export

## Test Chat
**Model:** openai

---

### **You** _(12:00:00)_

Hello

### **Assistant** _(12:00:01)_

Hi there!
`;
      const sessions = importMarkdown(md);
      expect(sessions.length).toBeGreaterThanOrEqual(1);
      expect(sessions[0].messages.length).toBeGreaterThanOrEqual(1);
    });

    it('throws for markdown without valid session structure', () => {
      const md = 'Some random text without headings';
      expect(() => importMarkdown(md)).toThrow();
    });
  });

  describe('exportMarkdown / importMarkdown roundtrip', () => {
    it('preserves message content through roundtrip', () => {
      const sessions = [
        makeSession('Round Trip', [
          makeMsg('Alpha', 'user'),
          makeMsg('Beta', 'assistant'),
        ]),
      ];

      const md = exportMarkdown(sessions);
      const imported = importMarkdown(md);

      expect(imported).toHaveLength(1);
      const msgContents = imported[0].messages.map((m) => m.content);
      expect(msgContents.some(c => c.includes('Alpha'))).toBe(true);
      expect(msgContents.some(c => c.includes('Beta'))).toBe(true);
    });
  });
});
