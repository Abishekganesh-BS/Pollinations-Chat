/**
 * Export / Import chat sessions as JSON or Markdown.
 */

import type { ChatSession, ChatExport, ChatMessage } from '../types';

// ─── Export ──────────────────────────────────────────────────────

export function exportJSON(sessions: ChatSession[]): string {
  const data: ChatExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sessions,
  };
  return JSON.stringify(data, null, 2);
}

export function exportMarkdown(sessions: ChatSession[]): string {
  const lines: string[] = [];
  lines.push('# Pollinations Chat Export');
  lines.push(`_Exported at ${new Date().toISOString()}_\n`);

  for (const session of sessions) {
    lines.push(`## ${session.title}`);
    lines.push(`**Model:** ${session.model} | **Created:** ${new Date(session.createdAt).toLocaleString()}`);
    lines.push(`**Pollen spent:** ${session.totalPollenSpent.toFixed(5)}\n`);
    lines.push('---\n');

    for (const msg of session.messages) {
      const roleLabel =
        msg.role === 'user' ? '**You**' :
        msg.role === 'assistant' ? '**Assistant**' :
        '**System**';
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      lines.push(`### ${roleLabel} _(${timestamp})_\n`);
      lines.push(msg.content);
      lines.push('');

      if (msg.attachments.length > 0) {
        lines.push('**Attachments:**');
        for (const att of msg.attachments) {
          if (att.type === 'image') {
            lines.push(`![${att.name}](${att.dataUrl})`);
          } else {
            lines.push(`- ${att.name} (${att.type}, ${(att.sizeBytes / 1024).toFixed(1)}KB)`);
          }
        }
        lines.push('');
      }
    }
    lines.push('\n---\n');
  }

  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ──────────────────────────────────────────────────────

export function importJSON(raw: string): ChatSession[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON format');
  }

  // Check if it's a ChatExport
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    'sessions' in parsed
  ) {
    const data = parsed as ChatExport;
    if (!Array.isArray(data.sessions)) {
      throw new Error('Invalid export: sessions must be an array');
    }
    validateSessions(data.sessions);
    return data.sessions;
  }

  // Maybe it's a raw array of sessions
  if (Array.isArray(parsed)) {
    validateSessions(parsed as ChatSession[]);
    return parsed as ChatSession[];
  }

  throw new Error('Unrecognized import format: expected { version, sessions } or array of sessions');
}

export function importMarkdown(md: string): ChatSession[] {
  // Parse the markdown back into a session structure
  const sessions: ChatSession[] = [];
  const sessionBlocks = md.split(/^## /m).filter(Boolean);

  // Skip the header block
  const startIdx = sessionBlocks[0]?.startsWith('# Pollinations') ? 1 : 0;

  for (let i = startIdx; i < sessionBlocks.length; i++) {
    const block = sessionBlocks[i];
    const titleMatch = block.match(/^(.+)\n/);
    const title = titleMatch?.[1]?.trim() ?? `Imported Chat ${i}`;

    const messages: ChatMessage[] = [];
    const msgBlocks = block.split(/^### /m).filter(Boolean);

    for (const msgBlock of msgBlocks.slice(1)) {
      // Parse role
      let role: 'user' | 'assistant' | 'system' = 'user';
      if (msgBlock.startsWith('**Assistant**')) role = 'assistant';
      else if (msgBlock.startsWith('**System**')) role = 'system';

      // Extract content (skip the first line which is the header)
      const contentLines = msgBlock.split('\n').slice(1);
      const content = contentLines
        .filter((l) => !l.startsWith('**Attachments:**') && !l.startsWith('!['))
        .join('\n')
        .trim();

      if (content) {
        messages.push({
          id: crypto.randomUUID(),
          role,
          content,
          mode: 'text',
          attachments: [],
          timestamp: Date.now(),
        });
      }
    }

    if (messages.length > 0) {
      sessions.push({
        id: crypto.randomUUID(),
        title,
        messages,
        model: 'openai',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalPollenSpent: 0,
      });
    }
  }

  if (sessions.length === 0) {
    throw new Error('No valid chat sessions found in Markdown');
  }

  return sessions;
}

function validateSessions(sessions: ChatSession[]): void {
  for (const s of sessions) {
    if (!s.id || !s.messages || !Array.isArray(s.messages)) {
      throw new Error(`Invalid session: missing id or messages`);
    }
  }
}
