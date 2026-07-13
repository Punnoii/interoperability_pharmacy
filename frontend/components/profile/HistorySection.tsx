"use client";

import type { HistoryEntry } from "@/lib/queryHistory";

interface Props {
  isDark: boolean;
  history: HistoryEntry[];
}

// scrollable query-history list; each row shows timestamp, row count or error, and a clipped query
export default function HistorySection({ isDark, history }: Props) {
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const code = isDark ? "text-slate-300" : "text-gray-700";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const rowBg = isDark ? "bg-slate-800/50" : "bg-gray-100";
  const okText = isDark ? "text-emerald-400" : "text-emerald-600";
  const errText = isDark ? "text-red-400" : "text-red-600";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-base font-semibold ${heading}`}>Query History</h3>
        <span className={`text-sm tabular-nums ${muted}`}>{history.length}</span>
      </div>

      {history.length === 0 ? (
        <p className={`text-sm italic ${muted} py-12 text-center`}>
          Don't have any history yet. Run some queries on the homepage to see them here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-[520px] overflow-auto">
          {history.map((h) => (
            <li key={h.id} className={`px-4 py-3 rounded-lg ${rowBg}`}>
              <div className={`text-xs flex items-center gap-2 flex-wrap mb-1 ${muted}`}>
                <span>{new Date(h.timestamp).toLocaleString("en-GB")}</span>
                {typeof h.resultCount === "number" && (
                  <>
                    <span>·</span>
                    <span className={okText}>
                      {h.resultCount} row{h.resultCount === 1 ? "" : "s"}
                    </span>
                  </>
                )}
                {h.error && (
                  <>
                    <span>·</span>
                    <span className={errText}>error</span>
                  </>
                )}
              </div>
              {/* cap long queries so one giant entry can't blow out the row */}
              <pre className={`text-xs font-mono leading-relaxed overflow-x-auto max-h-24 ${code}`}>
                {h.query.length > 240 ? h.query.slice(0, 240) + "\n..." : h.query}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
