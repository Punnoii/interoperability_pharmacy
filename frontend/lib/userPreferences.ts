"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { APP_CONFIG } from "./config";

const STORAGE_KEY = "rxvkg.userPreferences";

export interface UserPreferences {
  pageSize: number;
  defaultLimit: number;
  acThreshold: number;
  acMaxResults: number;
  simThreshold: number;
}

const DEFAULTS: UserPreferences = {
  pageSize: APP_CONFIG.query.pageSize,
  defaultLimit: APP_CONFIG.query.defaultLimit,
  acThreshold: APP_CONFIG.autocomplete.threshold,
  acMaxResults: APP_CONFIG.autocomplete.maxResults,
  simThreshold: APP_CONFIG.similarity.defaultThreshold,
};

interface PreferencesStore extends UserPreferences {
  update: (partial: Partial<UserPreferences>) => void;
  reset: () => void;
}

export const useUserPreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (partial) => set((state) => ({ ...state, ...partial })),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const PREFERENCES_DEFAULTS = DEFAULTS;
