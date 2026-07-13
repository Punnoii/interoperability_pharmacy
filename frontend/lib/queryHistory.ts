"use client";

import Cookies from "js-cookie";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP_CONFIG } from "./config";

const STORAGE_KEY = "rxvkg.queryHistory";
const COOKIE_NAME = "rxvkg_qh";
const COOKIE_PATH = "/history";

export interface HistoryEntry {
  id: string;
  query: string;
  source?: string;
  timestamp: number;
  resultCount?: number;
  error?: string;
}

export interface PendingQuery {
  query: string;
  source?: string;
}

interface HistoryStore {
  entries: HistoryEntry[];
  pending: PendingQuery | null;
  push: (entry: Omit<HistoryEntry, "id" | "timestamp">) => void;
  remove: (id: string) => void;
  clear: () => void;
  setPending: (p: PendingQuery) => void;
  popPending: () => PendingQuery | null;
}

// mirror a trimmed slice of history into a cookie so the /history server route can read it too — localStorage alone is client-only
function writeCookieBackup(entries: HistoryEntry[]) {
  const { cookieMax, cookieQueryLimit, cookieMaxAgeDays } = APP_CONFIG.history;
  const compact = entries.slice(0, cookieMax).map((e) => ({
    id: e.id,
    query:
      e.query.length > cookieQueryLimit
        ? e.query.slice(0, cookieQueryLimit)
        : e.query,
    source: e.source,
    timestamp: e.timestamp,
    resultCount: e.resultCount,
  }));
  try {
    Cookies.set(COOKIE_NAME, JSON.stringify(compact), {
      path: COOKIE_PATH,
      expires: cookieMaxAgeDays,
      sameSite: "lax",
    });
  } catch {}
}

function clearCookieBackup() {
  Cookies.remove(COOKIE_NAME, { path: COOKIE_PATH });
}

// recent-query store; entries persist in localStorage, `pending` is a one-shot handoff between pages
export const useQueryHistory = create<HistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      pending: null,

      // record a run, but skip blanks and dedupe an immediate repeat of the last query
      push: (entry) => {
        const trimmed = entry.query.trim();
        if (!trimmed) return;
        const list = get().entries;
        if (list.length > 0 && list[0].query.trim() === trimmed) return;

        const item: HistoryEntry = {
          id: nanoid(),
          timestamp: Date.now(),
          ...entry,
          query: trimmed,
        };
        const next = [item, ...list].slice(0, APP_CONFIG.history.maxEntries);
        set({ entries: next });
        writeCookieBackup(next);
      },

      remove: (id) => {
        const next = get().entries.filter((e) => e.id !== id);
        set({ entries: next });
        writeCookieBackup(next);
      },

      clear: () => {
        set({ entries: [] });
        clearCookieBackup();
      },

      setPending: (p) => set({ pending: p }),

      // read-and-clear: the query builder stashes a query, the results page grabs it exactly once
      popPending: () => {
        const p = get().pending;
        set({ pending: null });
        return p;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

// non-hook accessors so plain functions (fetch handlers, etc.) can touch history without a component
export function pushHistory(entry: Omit<HistoryEntry, "id" | "timestamp">) {
  useQueryHistory.getState().push(entry);
}

export function getHistory(): HistoryEntry[] {
  return useQueryHistory.getState().entries;
}

export function deleteHistoryEntry(id: string) {
  useQueryHistory.getState().remove(id);
}

export function clearHistory() {
  useQueryHistory.getState().clear();
}

export function setPendingQuery(p: PendingQuery) {
  useQueryHistory.getState().setPending(p);
}

export function popPendingQuery(): PendingQuery | null {
  return useQueryHistory.getState().popPending();
}
