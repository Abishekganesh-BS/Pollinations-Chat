/**
 * Hook: notification system with auto-dismiss.
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type { Notification, NotificationType } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addNotification = useCallback(
    (type: NotificationType, message: string, duration = 5000) => {
      const id = uuid();
      const notif: Notification = { id, type, message, duration };
      setNotifications((prev) => [...prev, notif]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
          timersRef.current.delete(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const notifySuccess = useCallback(
    (msg: string) => addNotification('success', msg),
    [addNotification],
  );
  const notifyError = useCallback(
    (msg: string) => addNotification('error', msg, 8000),
    [addNotification],
  );
  const notifyWarning = useCallback(
    (msg: string) => addNotification('warning', msg, 6000),
    [addNotification],
  );
  const notifyInfo = useCallback(
    (msg: string) => addNotification('info', msg),
    [addNotification],
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  };
}
