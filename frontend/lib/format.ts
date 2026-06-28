export function truncate(s: string, max = 200): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
