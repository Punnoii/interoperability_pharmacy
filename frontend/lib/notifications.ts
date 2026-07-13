"use client";

import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const STORAGE_KEY = "rxvkg.notifications";
const MAX_ENTRIES = 50;

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  items: Notification[];
  seeded: boolean;
  push: (n: { type: NotificationType; title: string; message?: string; read?: boolean }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  seedOnce: () => void;
}

// in-app notification bell, backed by zustand + localStorage so it survives reloads
export const useNotifications = create<NotificationStore>()(
  persist(
    (set, get) => ({
      items: [],
      seeded: false,

      // prepend a new notice; drop empty titles and cap the list so storage can't grow forever
      push: (n) => {
        const title = n.title.trim();
        if (!title) return;
        const item: Notification = {
          id: nanoid(),
          timestamp: Date.now(),
          read: n.read ?? false,
          type: n.type,
          title,
          message: n.message,
        };
        set({ items: [item, ...get().items].slice(0, MAX_ENTRIES) });
      },

      markRead: (id) =>
        set({ items: get().items.map((i) => (i.id === id ? { ...i, read: true } : i)) }),

      markAllRead: () =>
        set({ items: get().items.map((i) => (i.read ? i : { ...i, read: true })) }),

      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      clear: () => set({ items: [] }),

      // one-time welcome message, guarded by a persisted flag so it doesn't reappear every visit
      seedOnce: () => {
        if (get().seeded) return;
        set({ seeded: true });
        get().push({
          type: "info",
          title: "Welcome to RxVKG",
          message: "Notifications about your uploads, saves, and query results will appear here.",
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, seeded: s.seeded }),
    },
  ),
);

// fire a notification from outside react (event handlers, async callbacks) without a hook
export function notify(n: { type: NotificationType; title: string; message?: string }) {
  useNotifications.getState().push(n);
}

// thin per-type wrappers so call sites read like notifySuccess("saved")
export const notifyInfo = (title: string, message?: string) => notify({ type: "info", title, message });
export const notifySuccess = (title: string, message?: string) => notify({ type: "success", title, message });
export const notifyWarning = (title: string, message?: string) => notify({ type: "warning", title, message });
export const notifyError = (title: string, message?: string) => notify({ type: "error", title, message });
