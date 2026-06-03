"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rxvkg.darkMode";

export function useDarkMode(): [boolean, (next: boolean) => void] {
  const [isDark, setIsDarkState] = useState<boolean>(false);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached === "true") setIsDarkState(true);
    } catch {
    }

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
