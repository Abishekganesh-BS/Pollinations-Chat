/**
 * Hook: manage chat sessions in IndexedDB with auto-restore.
 */

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { ChatSession, ChatMessage } from '../types';
import {
  saveSession,
  getAllSessions,
  deleteSession as deleteSessionFromDB,
  clearAllSessions as clearAllSessionsFromDB,
  getLastActiveSession,
  setLastActiveSession,
  getSession,
} from '../lib/storage';

export function useLocalSession() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load sessions and restore last active
  useEffect(() => {
    (async () => {
      const all = await getAllSessions();
      setSessions(all);
      const lastId = await getLastActiveSession();
      if (lastId && all.some((s) => s.id === lastId)) {
        setActiveSessionId(lastId);
      } else if (all.length > 0) {
        setActiveSessionId(all[0].id);
      }
      setLoaded(true);
    })();
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const createSession = useCallback(
    async (model: string, title?: string): Promise<ChatSession> => {
      const session: ChatSession = {
        id: uuid(),
        title: title ?? 'New Chat',
        messages: [],
        model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalPollenSpent: 0,
      };
      await saveSession(session);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      await setLastActiveSession(session.id);
      return session;
    },
    [],
  );

  const switchSession = useCallback(async (id: string) => {
    setActiveSessionId(id);
    await setLastActiveSession(id);
  }, []);

  const addMessage = useCallback(
    async (sessionId: string, message: ChatMessage) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const updated = {
            ...s,
            messages: [...s.messages, message],
            updatedAt: Date.now(),
            // Auto-title from first user message
            title:
              s.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                : s.title,
          };
          saveSession(updated); // fire-and-forget
          return updated;
        }),
      );
    },
    [],
  );

  const updateMessage = useCallback(
    async (sessionId: string, messageId: string, update: Partial<ChatMessage>) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const updated = {
            ...s,
            messages: s.messages.map((m) =>
              m.id === messageId ? { ...m, ...update } : m,
            ),
            updatedAt: Date.now(),
          };
          saveSession(updated); // fire-and-forget
          return updated;
        }),
      );
    },
    [],
  );

  const updateSessionPollen = useCallback(
    async (sessionId: string, pollenDelta: number) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const updated = {
            ...s,
            totalPollenSpent: s.totalPollenSpent + pollenDelta,
            updatedAt: Date.now(),
          };
          saveSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const renameSession = useCallback(
    async (id: string, title: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, title, updatedAt: Date.now() };
          saveSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const deleteSessionById = useCallback(async (id: string) => {
    await deleteSessionFromDB(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((prevId) => (prevId === id ? null : prevId));
  }, []);

  /** Remove a single message by ID */
  const deleteMessage = useCallback(
    async (sessionId: string, messageId: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const updated = {
            ...s,
            messages: s.messages.filter((m) => m.id !== messageId),
            updatedAt: Date.now(),
          };
          saveSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  /** Remove a specific message and all messages after it in a session */
  const deleteMessagesFrom = useCallback(
    async (sessionId: string, messageId: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const idx = s.messages.findIndex((m) => m.id === messageId);
          if (idx === -1) return s;
          const updated = {
            ...s,
            messages: s.messages.slice(0, idx),
            updatedAt: Date.now(),
          };
          saveSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  /** Replace a message's content (for edit) */
  const replaceMessageContent = useCallback(
    async (sessionId: string, messageId: string, newContent: string) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const updated = {
            ...s,
            messages: s.messages.map((m) =>
              m.id === messageId ? { ...m, content: newContent } : m,
            ),
            updatedAt: Date.now(),
          };
          saveSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const clearAll = useCallback(async () => {
    await clearAllSessionsFromDB();
    setSessions([]);
    setActiveSessionId(null);
  }, []);

  const importSessions = useCallback(async (imported: ChatSession[]) => {
    for (const s of imported) {
      await saveSession(s);
    }
    // reload
    const all = await getAllSessions();
    setSessions(all);
  }, []);

  return {
    sessions,
    activeSession,
    activeSessionId,
    loaded,
    createSession,
    switchSession,
    addMessage,
    updateMessage,
    updateSessionPollen,
    renameSession,
    deleteSession: deleteSessionById,
    deleteMessage,
    deleteMessagesFrom,
    replaceMessageContent,
    importSessions,
    clearAll,
  };
}
