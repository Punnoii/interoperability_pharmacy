"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Persist dark-mode preference per logged-in user.
 *
 * IMPORTANT — hydration safety:
 *   The initial render value MUST be the same on the server and on the
 *   client's first paint, otherwise React throws a hydration mismatch. So we
 *   always start as `false` and then reconcile inside useEffect, which only
 *   runs AFTER hydration. The trade-off is a brief light-theme flash if the
 *   user prefers dark; eliminating that flash would require an inline script
 *   in <head> that runs before React (next-themes-style).
 *
 * Flow:
 *  1. SSR + first client render → always `false` (matches → no mismatch).
 *  2. After mount, read localStorage for an instant theme switch.
 *  3. Then fetch /api/me/preferences for the canonical value and reconcile.
 *  4. setIsDark updates state + localStorage optimistically, then PATCHes the
 *     server. PATCH failure keeps the local value; next reload reconciles.
 *
 * Returns [isDark, setIsDark] — drop-in replacement for useState<boolean>(false).
 */
const STORAGE_KEY = "rxvkg.darkMode";

export function useDarkMode(): [boolean, (next: boolean) => void] {
  // Always start as false — SSR and first client render must match.
  const [isDark, setIsDarkState] = useState<boolean>(false);

  // Reconcile with localStorage + server preference AFTER hydration.
  useEffect(() => {
    // 1) read localStorage for an instant post-hydration theme switch
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached === "true") setIsDarkState(true);
    } catch {
      // ignore quota / disabled storage
    }

    // 2) then fetch canonical value from server
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/preferences", { cache: "no-store" });
        if (!res.ok) return;
        const data: { darkMode?: unknown } = await res.json();
        if (cancelled) return;
        if (typeof data.darkMode === "boolean") {
          setIsDarkState(data.darkMode);
          try {
            window.localStorage.setItem(STORAGE_KEY, String(data.darkMode));
          } catch {
            // ignore
          }
        }
      } catch {
        // network error / not logged in — keep local cache
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setIsDark = useCallback((next: boolean) => {
    setIsDarkState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
    // fire-and-forget PATCH; if not logged in this 401s silently
    fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: next }),
    }).catch(() => {
      // network failure — keep local value, next reload reconciles
    });
  }, []);

  return [isDark, setIsDark];
}
