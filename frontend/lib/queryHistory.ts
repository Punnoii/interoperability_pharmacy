"use client";

const STORAGE_KEY = "rxvkg.queryHistory";
const PENDING_KEY = "rxvkg.pendingQuery";
const MAX_ENTRIES = 50;

const COOKIE_NAME = "rxvkg_qh";
const COOKIE_PATH = "/history";
const COOKIE_MAX = 10;
const COOKIE_QUERY_LIMIT = 200;
const COOKIE_MAX_AGE = 2592000;

export interface HistoryEntry {
  id: string;
  query: string;
  source: string;
  timestamp: number;
  resultCount?: number;
  error?: string;
}

export interface PendingQuery {
  query: string;
  source: string;
}

function safeReadLS(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.query === "string" &&
        typeof e.timestamp === "number",
    );
  } catch {
    return [];
  }
}

function safeWriteLS(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
  }
}

function readCookie(): HistoryEntry[] {
  if (typeof document === "undefined") return [];
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]*)"),
  );
  if (!match) return [];
  try {
    const json = decodeURIComponent(match[1]);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        typeof e.query === "string" &&
        typeof e.timestamp === "number",
    );
  } catch {
    return [];
  }
}

function writeCookie(entries: HistoryEntry[]) {
  if (typeof document === "undefined") return;
  const compact = entries.slice(0, COOKIE_MAX).map((e) => ({
    id: e.id,
    query:
      e.query.length > COOKIE_QUERY_LIMIT
        ? e.query.slice(0, COOKIE_QUERY_LIMIT)
        : e.query,
    source: e.source,
    timestamp: e.timestamp,
    resultCount: e.resultCount,
  }));
  try {
    const val = encodeURIComponent(JSON.stringify(compact));
    document.cookie = `${COOKIE_NAME}=${val}; path=${COOKIE_PATH}; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
  }
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=${COOKIE_PATH}; max-age=0; SameSite=Lax`;
}

function mergeStorages(ls: HistoryEntry[], ck: HistoryEntry[]): HistoryEntry[] {
  if (ls.length > 0) return ls;
  return ck;
}

export function getHistory(): HistoryEntry[] {
  const ls = safeReadLS();
  const ck = readCookie();
  return mergeStorages(ls, ck);
}

export function pushHistory(entry: Omit<HistoryEntry, "id" | "timestamp">) {
  const list = safeReadLS();
  const trimmedQuery = entry.query.trim();
  if (!trimmedQuery) return;

  if (
    list.length > 0 &&
    list[0].query.trim() === trimmedQuery &&
    list[0].source === entry.source
  ) {
    return;
  }

  const item: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    ...entry,
    query: trimmedQuery,
  };
  list.unshift(item);
  if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
  safeWriteLS(list);
  writeCookie(list);
}

export function deleteHistoryEntry(id: string) {
  const list = safeReadLS().filter((e) => e.id !== id);
  safeWriteLS(list);
  writeCookie(list);
}

export function clearHistory() {
  safeWriteLS([]);
  clearCookie();
}

export function setPendingQuery(p: PendingQuery) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
  }
}

export function popPendingQuery(): PendingQuery | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_KEY);
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.query === "string" &&
      typeof parsed.source === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
