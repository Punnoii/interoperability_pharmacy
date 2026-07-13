import jaccard from "talisman/metrics/jaccard";
import ngrams from "talisman/tokenizers/ngrams";
import { APP_CONFIG } from "./config";

// split into lowercased word tokens, keeping latin + thai chars; drop 1-char noise
const tokens = (s: string): string[] =>
  s.toLowerCase()
    .replace(/[^a-z0-9ก-๙\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

// strip to a bare alphanumeric+thai string for char-level n-gram comparison
const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");

// blend word-set and 3-gram jaccard, take the better of the two — catches both reworded and misspelled matches
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

// autocomplete ranking: similarity plus bonuses for substring/prefix hits, clamped to 1 so exact prefixes float to the top
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
