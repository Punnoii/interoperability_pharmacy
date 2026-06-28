export const APP_CONFIG = {
  autocomplete: {
    threshold: 0.2,
    maxResults: 8,
  },
  query: {
    pageSize: 10,
    defaultLimit: 150,
  },
  history: {
    maxEntries: 50,
    cookieMax: 10,
    cookieQueryLimit: 200,
    cookieMaxAgeDays: 30,
  },
  similarity: {
    defaultThreshold: 0.5,
    startsWithBonus: 0.3,
    substringBonus: 0.2,
    pairScore: {
      sharedId: 1.0,
      sameName: 0.9,
      minDisplay: 0.05,
    },
  },
} as const;
