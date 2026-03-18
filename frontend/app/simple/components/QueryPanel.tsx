"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

type Binding = Record<string, { type: string; value: string }>;

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: Binding[] };
}

const DEFAULT_QUERY = `SELECT * WHERE { ?s ?p ?o } LIMIT 100`;

export default function QueryPanel() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple client-side pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const tableRef = useRef<HTMLDivElement>(null);

  const handleRun = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults(null);
    setPage(1);

    try {
      const res = await fetch("/api/sparql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "default",
          query,
          accept: "application/sparql-results+json",
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const data = await res.json();
      setResults(data);
      // Scroll results into view
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const bindings = results?.results?.bindings ?? [];
  const vars = results?.head?.vars ?? [];
  const totalPages = Math.max(1, Math.ceil(bindings.length / PAGE_SIZE));
  const pageBindings = bindings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-auto">
      {/* ── Query Editor ── */}
      <div
        className="flex gap-3 items-start rounded-2xl p-4 border border-black/[0.08]"
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)" }}
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleRun();
            }
          }}
          rows={3}
          placeholder="Enter your SPARQL query…"
          className="flex-1 resize-y min-h-[52px] px-4 py-3 rounded-xl border border-black/10 text-sm font-mono leading-relaxed bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
        />
        <button
          onClick={handleRun}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white border-none cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
            boxShadow: "0 2px 8px rgba(33,150,243,0.3)",
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(33,150,243,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(33,150,243,0.3)";
          }}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          <span>{isLoading ? "Running…" : "Run"}</span>
        </button>
      </div>
      {/* 
      <p className="text-xs text-gray-400 -mt-2 pl-1">
        Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono text-[11px]">Ctrl+Enter</kbd> to run
      </p> */}

      {/* ── Results Area ── */}
      <div
        ref={tableRef}
        className="flex-1 rounded-2xl border border-black/[0.08] overflow-hidden"
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
      >
        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-500 px-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-base font-semibold">Query Failed</p>
            <p className="text-sm text-red-400 text-center max-w-md">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-blue-400">
            <Loader2 size={40} className="animate-spin" />
            <p className="text-sm text-gray-500">Executing query…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && !results && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <circle cx="60" cy="60" r="8" fill="currentColor" opacity="0.5" />
              <circle cx="30" cy="40" r="6" fill="currentColor" opacity="0.5" />
              <circle cx="90" cy="40" r="6" fill="currentColor" opacity="0.5" />
              <circle cx="30" cy="80" r="6" fill="currentColor" opacity="0.5" />
              <circle cx="90" cy="80" r="6" fill="currentColor" opacity="0.5" />
              <line x1="60" y1="60" x2="30" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <line x1="60" y1="60" x2="90" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <line x1="60" y1="60" x2="30" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <line x1="60" y1="60" x2="90" y2="80" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            </svg>
            <p className="text-lg font-semibold text-gray-500">No graph data to display</p>
            <p className="text-sm text-gray-400">Run a query to see results</p>
          </div>
        )}

        {/* Results table */}
        {!isLoading && !error && results && bindings.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Query returned 0 results</p>
          </div>
        )}

        {!isLoading && !error && results && bindings.length > 0 && (
          <div className="flex flex-col h-full">
            {/* Table header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] bg-gray-50/80">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {bindings.length.toLocaleString()} result{bindings.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages}
              </span>
            </div>

            {/* Scrollable table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50/60 text-blue-700">
                    <th className="px-4 py-3 text-left font-semibold border-b border-blue-100 w-10 text-xs">#</th>
                    {vars.map((v) => (
                      <th key={v} className="px-4 py-3 text-left font-semibold border-b border-blue-100 text-xs uppercase tracking-wide">
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageBindings.map((binding, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors duration-100"
                    >
                      <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      {vars.map((v) => {
                        const cell = binding[v];
                        const isUri = cell?.type === "uri";
                        return (
                          <td key={v} className="px-4 py-2.5 max-w-xs">
                            {cell ? (
                              isUri ? (
                                <a
                                  href={cell.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700 hover:underline truncate block text-xs font-mono"
                                  title={cell.value}
                                >
                                  {cell.value}
                                </a>
                              ) : (
                                <span className="text-gray-700 text-xs truncate block" title={cell.value}>
                                  {cell.value}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-black/[0.06] bg-gray-50/80">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ← Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 text-xs rounded-lg border transition-colors cursor-pointer
                          ${page === pageNum
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
