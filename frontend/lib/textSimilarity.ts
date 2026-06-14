export function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9ก-๙\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

export function trigrams(s: string): Set<string> {
  const set = new Set<string>();
  const padded = `  ${s.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "")}  `;
  if (padded.length < 3) return set;
  for (let i = 0; i <= padded.length - 3; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function nameSimilarity(
  a: string,
  b: string,
  tokensA?: Set<string>,
  tokensB?: Set<string>,
): number {
  const ta = tokensA ?? tokenize(a);
  const tb = tokensB ?? tokenize(b);
  const word = jaccard(ta, tb);
  const char = jaccard(trigrams(a), trigrams(b));
  return Math.max(word, char);
}

export interface HybridScoreOptions {
  startsWithBonus?: number;
  substringBonus?: number;
}

export function hybridScore(
  query: string,
  target: string,
  options: HybridScoreOptions = {},
): number {
  const { startsWithBonus = 0.3, substringBonus = 0.2 } = options;
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (q.length === 0) return 0;

  const ns = nameSimilarity(q, t);
  let score = ns;

  if (t.includes(q)) score += substringBonus;
  if (t.startsWith(q)) score += startsWithBonus;

  return Math.min(1, score);
}
