import jaccard from "talisman/metrics/jaccard";
import ngrams from "talisman/tokenizers/ngrams";
import { APP_CONFIG } from "./config";

const tokens = (s: string): string[] =>
  s.toLowerCase()
    .replace(/[^a-z0-9ก-๙\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const wordScore = jaccard(tokens(a), tokens(b));
  const na = normalize(a);
  const nb = normalize(b);
  const charScore =
    na.length >= 3 && nb.length >= 3
      ? jaccard(ngrams(3, na), ngrams(3, nb))
      : 0;
  return Math.max(wordScore, charScore);
}

export function hybridScore(query: string, target: string): number {
  if (!query || !target) return 0;
  const { startsWithBonus, substringBonus } = APP_CONFIG.similarity;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!q) return 0;

  let score = nameSimilarity(q, t);
  if (t.includes(q)) score += substringBonus;
  if (t.startsWith(q)) score += startsWithBonus;
  return Math.min(1, score);
}
