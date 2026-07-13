"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rxvkg.darkMode";

// toggle the `dark` class tailwind keys off; guarded for SSR where document doesn't exist
function applyDarkClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
}

// dark-mode state that's optimistic from localStorage but reconciled with the server preference
export function useDarkMode(): [boolean, (next: boolean) => void] {
  const [isDark, setIsDarkState] = useState<boolean>(false);

  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  useEffect(() => {
    // paint the cached choice immediately to avoid a flash, then fetch the authoritative value
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached === "true") setIsDarkState(true);
    } catch {
    }

    // guard against a late fetch resolving after unmount and clobbering state
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
          }
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // flip locally right away, cache it, then persist to the server fire-and-forget (errors ignored)
  const setIsDark = useCallback((next: boolean) => {
    setIsDarkState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
    }
    fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: next }),
    }).catch(() => {
    });
  }, []);

  return [isDark, setIsDark];
}
