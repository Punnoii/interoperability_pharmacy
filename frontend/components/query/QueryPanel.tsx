"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";

type Binding = Record<string, { type: string; value: string }>;

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: Binding[] };
}

interface QueryPanelProps {
  isDark: boolean;
}

type EndpointKey = "default" | "mysql";

const DEFAULT_QUERY = `SELECT * WHERE { ?s ?p ?o } LIMIT 100`;

const ENDPOINT_OPTIONS: { key: EndpointKey; label: string; hint: string }[] = [
  { key: "default", label: "PostgreSQL (Company A + B)", hint: "Ontop @ :8080" },
  { key: "mysql", label: "MySQL (Company C)", hint: "Ontop @ :8081" },
];

export default function QueryPanel({ isDark }: QueryPanelProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [endpoint, setEndpoint] = useState<EndpointKey>("default");
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
          endpoint,
          query,
          accept: "application/sparql-results+json",
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const data = await res.json();
      setResults(data);
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

  // Dark mode token shortcuts
  const cardBg = isDark ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.85)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const inputBg = isDark ? "#0f172a" : "#ffffff";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputFg = isDark ? "#e2e8f0" : "#1f2937";
  const placeholderColor = isDark ? "#475569" : "#9ca3af";
  const tableBg = isDark ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.85)";
  const theadBg = isDark ? "rgba(33,150,243,0.12)" : "rgba(219,234,254,0.6)";
  const theadColor = isDark ? "#60a5fa" : "#1d4ed8";
  const theadBorder = isDark ? "#1e40af40" : "#bfdbfe";
  const rowBorder = isDark ? "rgba(255,255,255,0.04)" : "#f9fafb";
  const rowHoverBg = isDark ? "rgba(33,150,243,0.08)" : "rgba(219,234,254,0.3)";
  const mutedText = isDark ? "#64748b" : "#9ca3af";
  const bodyText = isDark ? "#cbd5e1" : "#374151";
  const linkColor = isDark ? "#60a5fa" : "#3b82f6";
  const linkHover = isDark ? "#93c5fd" : "#1d4ed8";
  const paginationBg = isDark ? "rgba(15,23,42,0.8)" : "rgba(249,250,251,0.8)";
  const paginationBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const btnBorder = isDark ? "#334155" : "#e5e7eb";
  const btnText = isDark ? "#94a3b8" : "#4b5563";
  const btnHoverBg = isDark ? "#1e293b" : "#f3f4f6";

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-auto">
      {/* ── Query Editor ── */}
      <div
        className="flex gap-3 items-start rounded-2xl p-4 transition-colors duration-300"
        style={{
          background: cardBg,
          backdropFilter: "blur(10px)",
          border: `1px solid ${cardBorder}`,
        }}
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
          className="flex-1 resize-y min-h-[52px] px-4 py-3 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 transition-all"
          style={{
            background: inputBg,
            color: inputFg,
            border: `1px solid ${inputBorder}`,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            // placeholder color via inline is not standard; handled via CSS variable trick with a class below
          }}
        />
        <div className="flex flex-col gap-2">
          <select
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value as EndpointKey)}
            disabled={isLoading}
            aria-label="SPARQL endpoint"
            className="px-3 py-2 rounded-xl text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: inputBg,
              color: inputFg,
              border: `1px solid ${inputBorder}`,
              minWidth: 200,
            }}
            title={ENDPOINT_OPTIONS.find((o) => o.key === endpoint)?.hint}
          >
            {ENDPOINT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white border-none cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
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
      </div>

      {/* ── Results Area ── */}
      <div
        ref={tableRef}
        className="flex-1 rounded-2xl overflow-hidden transition-colors duration-300"
        style={{
          background: tableBg,
          backdropFilter: "blur(10px)",
          border: `1px solid ${cardBorder}`,
          boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 px-8" style={{ color: "#f87171" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-base font-semibold">Query Failed</p>
            <p className="text-sm text-center max-w-md" style={{ color: "#fca5a5" }}>{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-blue-400">
            <Loader2 size={40} className="animate-spin" />
            <p className="text-sm" style={{ color: mutedText }}>Executing query…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && !results && (
          <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ color: mutedText }}>
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
            <p className="text-lg font-semibold" style={{ color: isDark ? "#475569" : "#6b7280" }}>No graph data to display</p>
            <p className="text-sm" style={{ color: mutedText }}>Run a query to see results</p>
          </div>
        )}

        {/* Zero results */}
        {!isLoading && !error && results && bindings.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-2" style={{ color: mutedText }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 17H7A5 5 0 0 1 7 7h2" />
              <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="text-sm font-medium" style={{ color: isDark ? "#475569" : "#6b7280" }}>Query returned 0 results</p>
          </div>
        )}

        {!isLoading && !error && results && bindings.length > 0 && (
          <div className="flex flex-col h-full">
            {/* Table header bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{
                background: paginationBg,
                borderBottom: `1px solid ${paginationBorder}`,
              }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: mutedText }}>
                {bindings.length.toLocaleString()} result{bindings.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs" style={{ color: mutedText }}>
                Page {page} of {totalPages}
              </span>
            </div>

            {/* Scrollable table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: theadBg, color: theadColor }}>
                    <th
                      className="px-4 py-3 text-left font-semibold text-xs w-10"
                      style={{ borderBottom: `1px solid ${theadBorder}` }}
                    >
                      #
                    </th>
                    {vars.map((v) => (
                      <th
                        key={v}
                        className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide"
                        style={{ borderBottom: `1px solid ${theadBorder}` }}
                      >
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageBindings.map((binding, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors duration-100"
                      style={{ borderBottom: `1px solid ${rowBorder}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = rowHoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <td className="px-4 py-2.5 text-xs font-mono" style={{ color: mutedText }}>
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
                                  className="truncate block text-xs font-mono hover:underline"
                                  style={{ color: linkColor }}
                                  title={cell.value}
                                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = linkHover)}
                                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = linkColor)}
                                >
                                  {cell.value}
                                </a>
                              ) : (
                                <span className="text-xs truncate block" style={{ color: bodyText }} title={cell.value}>
                                  {cell.value}
                                </span>
                              )
                            ) : (
                              <span className="text-xs" style={{ color: isDark ? "#334155" : "#d1d5db" }}>
                                —
                              </span>
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
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{
                  background: paginationBg,
                  borderTop: `1px solid ${paginationBorder}`,
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: `1px solid ${btnBorder}`,
                    color: btnText,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => { if (page !== 1) (e.currentTarget.style.background = btnHoverBg); }}
                  onMouseLeave={(e) => { (e.currentTarget.style.background = "transparent"); }}
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
                    const isCurrentPage = page === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className="w-7 h-7 text-xs rounded-lg transition-colors cursor-pointer"
                        style={{
                          background: isCurrentPage ? "#2196f3" : "transparent",
                          color: isCurrentPage ? "#ffffff" : btnText,
                          border: isCurrentPage ? "1px solid #2196f3" : `1px solid ${btnBorder}`,
                        }}
                        onMouseEnter={(e) => { if (!isCurrentPage) (e.currentTarget.style.background = btnHoverBg); }}
                        onMouseLeave={(e) => { if (!isCurrentPage) (e.currentTarget.style.background = "transparent"); }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: `1px solid ${btnBorder}`,
                    color: btnText,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => { if (page !== totalPages) (e.currentTarget.style.background = btnHoverBg); }}
                  onMouseLeave={(e) => { (e.currentTarget.style.background = "transparent"); }}
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
