// clip long strings for display; the "..." eats into the max so the result never exceeds it
export function truncate(s: string, max = 200): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 3) + "..." : s;
}

// byte count, human size, one unit deep (B / KB / MB)
export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// relative timestamp; rolls up to an absolute date once it's a week or older
export function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
