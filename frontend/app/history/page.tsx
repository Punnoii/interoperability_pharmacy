"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Search, Trash2, X } from "lucide-react";
import Header from "@/components/layout/Header";
import { useDarkMode } from "@/lib/useDarkMode";
import {
  useQueryHistory,
  setPendingQuery,
  type HistoryEntry,
} from "@/lib/queryHistory";

// past-queries list — reads the local (zustand) history store, no server round-trip
export default function HistoryPage() {
  const [isDark, setIsDark] = useDarkMode();
  const entries = useQueryHistory((s) => s.entries);
  const remove = useQueryHistory((s) => s.remove);
  const clear = useQueryHistory((s) => s.clear);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // client-side text filter over the stored queries
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.query.toLowerCase().includes(q));
  }, [entries, search]);

  // stash the query then jump to the editor; homepage picks it up via the pending-query handoff
  function handleLoad(e: HistoryEntry) {
    setPendingQuery({ query: e.query });
    router.push("/homepage");
  }

  function handleDelete(id: string) {
    remove(id);
  }

  // wipes the whole store — confirm first since there's no undo
  function handleClearAll() {
    if (!confirm("Are you sure you want to clear all history?")) return;
    clear();
  }

  const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-gray-900";
  const card = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400";

  return (
    <div className={`flex flex-col min-h-screen ${bg}`}>
      <Header isDark={isDark} setIsDark={setIsDark} />

      <main className="flex-1 px-6 py-8 max-w-5xl w-full mx-auto">
        <Link
          href="/homepage"
          className={`inline-flex items-center gap-2 text-sm font-medium mb-4 transition-colors ${
            isDark ? "text-slate-400 hover:text-slate-100" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <h1 className={`text-3xl font-bold ${heading}`} style={{ fontFamily: "Georgia, serif" }}>
            Query History
          </h1>
        </div>

        <div className={`rounded-2xl border p-4 ${card} flex items-center gap-3 mb-4`}>
          <Search size={16} className={muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search query"
            className={`flex-1 bg-transparent text-sm outline-none ${inputCls.replace(/bg-\S+/, "")}`}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className={`p-1 rounded ${
                isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-400 hover:bg-gray-100"
              }`}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          {entries.length > 0 && (
            <button
              onClick={handleClearAll}
              className={`text-xs px-3 py-1.5 rounded border ${
                isDark
                  ? "border-red-700/50 text-red-300 hover:bg-red-900/30"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              Clear All
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${card}`}>
            <p className={`text-sm ${muted}`}>
              Don't have any history yet. Run some queries on the homepage to see them here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`rounded-2xl border p-12 text-center ${card}`}>
            <p className={`text-sm ${muted}`}>Don't Have Query &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((e) => (
              <li key={e.id}>
                <div className={`rounded-2xl border p-4 ${card}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className={`text-xs ${muted} flex items-center gap-2 flex-wrap`}>
                        <span>{new Date(e.timestamp).toLocaleString("en-GB")}</span>
                        {typeof e.resultCount === "number" && (
                          <>
                            <span>·</span>
                            <span className={isDark ? "text-emerald-400" : "text-emerald-600"}>
                              {e.resultCount} row{e.resultCount === 1 ? "" : "s"}
                            </span>
                          </>
                        )}
                        {e.error && (
                          <>
                            <span>·</span>
                            <span className={isDark ? "text-red-400" : "text-red-600"}>
                              error
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleLoad(e)}
                        title="Load query editor"
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-medium ${
                          isDark
                            ? "bg-blue-900/40 text-blue-300 hover:bg-blue-900/60"
                            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        <Play size={12} />
                        <span>Load</span>
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        title="Delete history entry"
                        aria-label="Delete entry"
                        className={`p-1.5 rounded ${
                          isDark ? "text-slate-400 hover:bg-slate-800 hover:text-red-400" : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <pre
                    className={`px-3 py-2 rounded-md text-xs font-mono leading-relaxed overflow-x-auto max-h-32 ${
                      isDark ? "bg-slate-950 text-slate-300" : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    {e.query.length > 400 ? e.query.slice(0, 400) + "\n..." : e.query}
                  </pre>
                  {e.error && (
                    <p className={`text-xs mt-2 ${isDark ? "text-red-400" : "text-red-500"}`}>
                      {e.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
