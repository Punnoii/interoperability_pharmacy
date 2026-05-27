"use client";

import { useRef, useState } from "react";
import { Loader2, Network, Play, Table2 } from "lucide-react";
import ResultsGraph from "@/components/graph/ResultsGraph";
import type { SparqlBinding } from "@/components/graph/graphUtils";

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

interface QueryPanelProps {
  isDark: boolean;
}

type ViewMode = "table" | "graph";
type SourceKey = "all" | "a" | "b" | "c" | "d" | "e";

const SOURCES: { key: SourceKey; label: string }[] = [
  { key: "all", label: "All Sources" },
  { key: "a", label: "Company A — PostgreSQL" },
  { key: "b", label: "Company B — PostgreSQL" },
  { key: "c", label: "Company C — MySQL" },
  { key: "d", label: "Company D — MongoDB" },
  { key: "e", label: "Company E — Postgres (CSV)" },
];

const SUBSTANCE_BASE_IRI = "http://example.com/idmp-demo/substance/";

function applySourceFilter(query: string, source: SourceKey): string {
  if (source === "all") return query;
  if (!/\?substance\b/.test(query)) return query;

  const prefix = `${SUBSTANCE_BASE_IRI}${source}/`;
  const filterClause = `  FILTER(STRSTARTS(STR(?substance), "${prefix}"))\n`;

  const whereMatch = query.match(/WHERE\s*\{/i);
  if (!whereMatch || whereMatch.index === undefined) return query;

  const openIdx = whereMatch.index + whereMatch[0].length;
  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < query.length; i++) {
    const ch = query[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      if (depth === 0) {
        closeIdx = i;
        break;
      }
      depth--;
    }
  }

  if (closeIdx === -1) return query;
  return query.slice(0, closeIdx) + filterClause + query.slice(closeIdx);
}

const DEFAULT_QUERY = `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX idmp-dtp: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO21090-HarmonizedDatatypes/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>

SELECT ?substance ?substanceType ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceType ?substanceType ;
             idmp-sub:hasSubstanceName ?nameNode ;
             cmns-id:isIdentifiedBy ?identifierNode .
  ?nameNode idmp-sub:hasSubstanceNameValue ?nameValue .
  ?identifierNode cmns-txt:hasTextValue ?identifierValue .
}
ORDER BY ?substance
LIMIT 50
`;
const PAGE_SIZE = 10;

export default function QueryPanel({ isDark }: QueryPanelProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [source, setSource] = useState<SourceKey>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);

  const resultsRef = useRef<HTMLDivElement>(null);

  async function handleRun() {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    setResults(null);
    setPage(1);
    setViewMode("table");

    const finalQuery = applySourceFilter(query, source);

    try {
      const res = await fetch("/api/sparql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: finalQuery,
          accept: "application/sparql-results+json",
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

      const data = await res.json();
      setResults(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  const bindings = results?.results?.bindings ?? [];
  const vars = results?.head?.vars ?? [];
  const totalPages = Math.max(1, Math.ceil(bindings.length / PAGE_SIZE));
  const pageBindings = bindings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const card = isDark
    ? "bg-slate-800 border-slate-700"
    : "bg-white border-gray-200";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-auto">
      {/* Query editor */}
      <div className={`flex gap-3 items-start rounded-lg border p-3 ${card}`}>
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
          placeholder="Enter your SPARQL query..."
          className={`flex-1 resize-y min-h-[52px] px-3 py-2 rounded border text-sm font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
        />
        <div className="flex flex-col gap-2 self-start">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SourceKey)}
            disabled={isLoading}
            title="Inject FILTER(STRSTARTS(?substance, ...)) into the query"
            className={`px-2 py-2 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 ${inputCls}`}
            style={{ minWidth: 240 }}
          >
            {SOURCES.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{isLoading ? "Running..." : "Run"}</span>
          </button>
        </div>
      </div>

      <div ref={resultsRef} className={`flex-1 rounded-lg border overflow-hidden ${card}`}>
        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-2 px-6 text-red-500">
            <p className="text-sm font-semibold">Query failed</p>
            <p className={`text-xs text-center max-w-md ${muted}`}>{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-blue-500">
            <Loader2 size={28} className="animate-spin" />
            <p className={`text-xs ${muted}`}>Executing query...</p>
          </div>
        )}

        {!isLoading && !error && !results && (
          <div className={`flex flex-col items-center justify-center h-64 gap-2 ${muted}`}>
            <p className="text-sm">No results yet</p>
            <p className="text-xs">Run a query to see results</p>
          </div>
        )}

        {!isLoading && !error && results && bindings.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-64 gap-2 ${muted}`}>
            <p className="text-sm">Query returned 0 rows</p>
          </div>
        )}

        {!isLoading && !error && results && bindings.length > 0 && (
          <div className="flex flex-col h-full">
            <div
              className={`flex items-center justify-between gap-3 px-4 py-2 border-b ${isDark ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50"
                }`}
            >
              {viewMode === "table" ? (
                <span className={`text-xs font-semibold ${subtle}`}>
                  {bindings.length.toLocaleString()} result{bindings.length !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="w-px" />
              )}

              <div
                className={`flex rounded-md overflow-hidden border text-xs font-medium ${isDark ? "border-slate-700" : "border-gray-300"
                  }`}
              >
                <ViewToggle
                  active={viewMode === "table"}
                  onClick={() => setViewMode("table")}
                  isDark={isDark}
                  icon={<Table2 size={13} />}
                  label="Table"
                />
                <ViewToggle
                  active={viewMode === "graph"}
                  onClick={() => setViewMode("graph")}
                  disabled={vars.length < 2}
                  title={vars.length < 2 ? "Need at least 2 SELECT variables" : undefined}
                  isDark={isDark}
                  icon={<Network size={13} />}
                  label="Graph"
                />
              </div>

              {viewMode === "table" ? (
                <span className={`text-xs tabular-nums ${muted}`}>
                  Page {page} of {totalPages}
                </span>
              ) : (
                <span className="w-px" />
              )}
            </div>

            {viewMode === "graph" && (
              <div className="flex-1 min-h-[420px] overflow-hidden">
                <ResultsGraph vars={vars} bindings={bindings} isDark={isDark} />
              </div>
            )}

            {viewMode === "table" && (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse">
                  <thead
                    className={`text-xs uppercase ${isDark ? "bg-slate-900 text-slate-400" : "bg-gray-50 text-gray-600"
                      }`}
                  >
                    <tr>
                      <th className={`px-3 py-2 text-left font-semibold w-10 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                        #
                      </th>
                      {vars.map((v) => (
                        <th
                          key={v}
                          className={`px-3 py-2 text-left font-semibold border-b ${isDark ? "border-slate-700" : "border-gray-200"
                            }`}
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
                        className={
                          isDark
                            ? "border-b border-slate-800 hover:bg-slate-700/40"
                            : "border-b border-gray-100 hover:bg-gray-50"
                        }
                      >
                        <td className={`px-3 py-2 text-xs font-mono ${muted}`}>
                          {(page - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        {vars.map((v) => {
                          const cell = binding[v];
                          const isUri = cell?.type === "uri";
                          return (
                            <td key={v} className="px-3 py-2 max-w-xs">
                              {cell ? (
                                isUri ? (
                                  <a
                                    href={cell.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate block text-xs font-mono text-blue-600 hover:underline dark:text-blue-400"
                                    title={cell.value}
                                  >
                                    {cell.value}
                                  </a>
                                ) : (
                                  <span className={`text-xs truncate block ${subtle}`} title={cell.value}>
                                    {cell.value}
                                  </span>
                                )
                              ) : (
                                <span className={`text-xs ${muted}`}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {viewMode === "table" && totalPages > 1 && (
              <div
                className={`flex items-center justify-between gap-3 px-4 py-2 border-t ${isDark ? "border-slate-700 bg-slate-900/50" : "border-gray-200 bg-gray-50"
                  }`}
              >
                <PageBtn isDark={isDark} disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ← Previous
                </PageBtn>

                <div className="flex gap-1">
                  {pageNumbers(page, totalPages).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-7 h-7 text-xs rounded border tabular-nums ${n === page
                        ? "bg-blue-600 text-white border-blue-600"
                        : isDark
                          ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                          : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <PageBtn
                  isDark={isDark}
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </PageBtn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  disabled,
  title,
  isDark,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  const activeCls = "bg-blue-600 text-white";
  const inactiveCls = isDark
    ? "text-slate-400 hover:bg-slate-800"
    : "text-gray-600 hover:bg-gray-100";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      role="tab"
      aria-selected={active}
      className={`flex items-center gap-1.5 px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${active ? activeCls : inactiveCls
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PageBtn({
  isDark,
  disabled,
  onClick,
  children,
}: {
  isDark: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 text-xs rounded border disabled:opacity-40 disabled:cursor-not-allowed ${isDark
        ? "border-slate-700 text-slate-400 hover:bg-slate-800"
        : "border-gray-300 text-gray-600 hover:bg-gray-100"
        }`}
    >
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): number[] {
  const max = Math.min(total, 7);
  const out: number[] = [];
  let start: number;
  if (total <= 7) start = 1;
  else if (current <= 4) start = 1;
  else if (current >= total - 3) start = total - 6;
  else start = current - 3;
  for (let i = 0; i < max; i++) out.push(start + i);
  return out;
}
