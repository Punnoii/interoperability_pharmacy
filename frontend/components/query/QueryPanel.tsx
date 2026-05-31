"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Code2, Database, FileCode2, Loader2, MoreVertical, Network, Pencil, Play, Sparkles, Table2, Trash2, Wand2, X } from "lucide-react";
import ResultsGraph from "@/components/graph/ResultsGraph";
import type { SparqlBinding } from "@/components/graph/graphUtils";

type QueryMode = "nlp" | "manual";

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

interface QueryPanelProps {
  isDark: boolean;
}

interface BookmarkItem {
  id: string;
  name: string;
  query: string;
  source: string;
  createdAt: string;
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
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>

SELECT ?substance ?substanceType ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceType ?substanceType ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
  ?i cmns-txt:hasTextValue ?identifierValue .
}
ORDER BY ?substance
LIMIT 50
`;
const PAGE_SIZE = 10;

export default function QueryPanel({ isDark }: QueryPanelProps) {
  const [queryMode, setQueryMode] = useState<QueryMode>("manual");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [source, setSource] = useState<SourceKey>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);
  const [editQueryText, setEditQueryText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchBookmarks = useCallback(async () => {
    setBookmarksLoading(true);
    try {
      const res = await fetch("/api/bookmarks", { cache: "no-store" });
      if (!res.ok) {
        setBookmarks([]);
        return;
      }
      const data = await res.json();
      setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    } catch {
      setBookmarks([]);
    } finally {
      setBookmarksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  async function handleSaveBookmark() {
    if (!query.trim() || saving) return;
    const defaultName = `Query ${new Date().toLocaleString()}`;
    const name = window.prompt("Name this saved query:", defaultName)?.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, query, source }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data?.error ?? res.statusText}`);
        return;
      }
      const data = await res.json();
      if (data.bookmark) {
        setBookmarks((prev) => [data.bookmark, ...prev]);
      } else {
        fetchBookmarks();
      }
    } catch (e) {
      alert(`Save failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  function handleLoadBookmark(b: BookmarkItem) {
    if (!confirm(`Do you wanna use ${b.name} to Query?`)) return;
    setQueryMode("manual");
    setQuery(b.query);
    if (b.source === "all" || b.source === "a" || b.source === "b" || b.source === "c" || b.source === "d" || b.source === "e") {
      setSource(b.source);
    }
  }

  async function handleDeleteBookmark(id: string) {
    setOpenMenuId(null);
    if (!confirm("ลบ bookmark นี้?")) return;
    try {
      const res = await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Delete failed: ${data?.error ?? res.statusText}`);
        return;
      }
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  async function handleRenameBookmark(b: BookmarkItem) {
    setOpenMenuId(null);
    const next = window.prompt("Rename saved query:", b.name)?.trim();
    if (!next || next === b.name) return;
    try {
      const res = await fetch(`/api/bookmarks/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Rename failed: ${data?.error ?? res.statusText}`);
        return;
      }
      const data = await res.json();
      const updated: BookmarkItem | undefined = data.bookmark;
      if (updated) {
        setBookmarks((prev) => prev.map((x) => (x.id === b.id ? updated : x)));
      }
    } catch (e) {
      alert(`Rename failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  function handleEditBookmarkOpen(b: BookmarkItem) {
    setOpenMenuId(null);
    setEditingBookmark(b);
    setEditQueryText(b.query);
  }

  function handleEditBookmarkCancel() {
    if (editSaving) return;
    setEditingBookmark(null);
    setEditQueryText("");
  }

  async function handleEditBookmarkSave() {
    if (!editingBookmark) return;
    const next = editQueryText.trim();
    if (!next) {
      alert("Query ห้ามว่าง");
      return;
    }
    if (next === editingBookmark.query) {
      // no change
      setEditingBookmark(null);
      setEditQueryText("");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/bookmarks/${editingBookmark.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Update failed: ${data?.error ?? res.statusText}`);
        return;
      }
      const data = await res.json();
      const updated: BookmarkItem | undefined = data.bookmark;
      if (updated) {
        setBookmarks((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
      setEditingBookmark(null);
      setEditQueryText("");
    } catch (e) {
      alert(`Update failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setEditSaving(false);
    }
  }

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

  const sourceLabel = SOURCES.find((s) => s.key === source)?.label ?? "All Sources";

  return (
    <div className="flex h-full overflow-hidden">
      <DatabaseInfoPanel
        isDark={isDark}
        mode={queryMode}
        onModeChange={setQueryMode}
        sourceLabel={sourceLabel}
        resultCount={results ? bindings.length : null}
        bookmarks={bookmarks}
        bookmarksLoading={bookmarksLoading}
        openMenuId={openMenuId}
        onOpenMenu={setOpenMenuId}
        onLoadBookmark={handleLoadBookmark}
        onRenameBookmark={handleRenameBookmark}
        onEditBookmark={handleEditBookmarkOpen}
        onDeleteBookmark={handleDeleteBookmark}
      />

      <section className="flex-1 overflow-auto">
        {queryMode === "nlp" ? (
          <NLPPlaceholder isDark={isDark} />
        ) : (
          <ManualQueryView isDark={isDark} />
        )}
      </section>

      {/* Edit Query modal — overlays everything, edits the saved query's content. */}
      {editingBookmark && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60"
          onClick={handleEditBookmarkCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-lg border shadow-2xl ${
              isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
            }`}
          >
            <div
              className={`flex items-center justify-between px-4 py-3 border-b ${
                isDark ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <h3 className={`text-sm font-bold truncate ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                Edit Query — {editingBookmark.name}
              </h3>
              <button
                onClick={handleEditBookmarkCancel}
                disabled={editSaving}
                aria-label="Close"
                className={`p-1 rounded shrink-0 ${
                  isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
                } disabled:opacity-60`}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editQueryText}
                onChange={(e) => setEditQueryText(e.target.value)}
                rows={14}
                spellCheck={false}
                className={`w-full px-3 py-2 rounded border text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? "bg-slate-950 border-slate-700 text-slate-100"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <p className={`text-[10px] mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                แก้ไข SPARQL ของ bookmark นี้ จากนั้นกด Save เพื่อบันทึก (ไม่กระทบ editor หลัก)
              </p>
            </div>
            <div
              className={`px-4 py-3 border-t flex justify-end gap-2 ${
                isDark ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <button
                onClick={handleEditBookmarkCancel}
                disabled={editSaving}
                className={`px-3 py-1.5 rounded text-xs font-medium border disabled:opacity-60 ${
                  isDark
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleEditBookmarkSave}
                disabled={editSaving || !editQueryText.trim()}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {editSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                <span>{editSaving ? "Saving..." : "Save"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function ManualQueryView({ isDark }: { isDark: boolean }) {
    return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-auto">
      <div className={`flex gap-3 items-stretch rounded-lg border p-3 ${card}`}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleRun();
            }
          }}
          rows={6}
          placeholder="Enter your SPARQL query..."
          className={`flex-1 resize-y min-h-[140px] px-3 rounded border text-sm font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
        />
        <div className="flex flex-col gap-2">
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
          <button
            onClick={handleSaveBookmark}
            disabled={isLoading || saving || !query.trim()}
            title="Save this query to your bookmarks"
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              isDark
                ? "border-slate-700 text-slate-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
            <span>{saving ? "Saving..." : "Save"}</span>
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
}

function DatabaseInfoPanel({
  isDark,
  mode,
  onModeChange,
  sourceLabel,
  resultCount,
  bookmarks,
  bookmarksLoading,
  openMenuId,
  onOpenMenu,
  onLoadBookmark,
  onRenameBookmark,
  onEditBookmark,
  onDeleteBookmark,
}: {
  isDark: boolean;
  mode: QueryMode;
  onModeChange: (m: QueryMode) => void;
  sourceLabel: string;
  resultCount: number | null;
  bookmarks: BookmarkItem[];
  bookmarksLoading: boolean;
  openMenuId: string | null;
  onOpenMenu: (id: string | null) => void;
  onLoadBookmark: (b: BookmarkItem) => void;
  onRenameBookmark: (b: BookmarkItem) => void;
  onEditBookmark: (b: BookmarkItem) => void;
  onDeleteBookmark: (id: string) => void;
}) {
  const bg = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const tabActive = "bg-blue-600 text-white border-blue-600";
  const tabInactive = isDark
    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
    : "border-gray-300 text-gray-600 hover:bg-gray-100";
  const sectionLabel = `text-[10px] uppercase tracking-wider font-semibold ${muted}`;
  const statBox = isDark
    ? "rounded border border-slate-800 bg-slate-950 p-2"
    : "rounded border border-gray-200 bg-gray-50 p-2";

  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function close() {
      onOpenMenu(null);
      setMenuPos(null);
    }
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-bookmark-popup]")) return;
      if (target.closest(`[data-bookmark-kebab="${openMenuId}"]`)) return;
      close();
    }
    function onScrollOrResize() {
      close();
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [openMenuId, onOpenMenu]);

  const MENU_WIDTH = 168;
  const openBookmark = openMenuId ? bookmarks.find((b) => b.id === openMenuId) : null;

  return (
    <aside className={`w-72 shrink-0 border-r overflow-y-auto ${bg}`}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-blue-600" />
          <h2 className={`text-sm font-bold ${heading}`}>Database Information</h2>
        </div>

        <div className="flex flex-col gap-2">
          <span className={sectionLabel}>Query Mode</span>
          <button
            onClick={() => onModeChange("nlp")}
            className={`flex items-start gap-2 px-3 py-2 rounded border text-left text-xs transition-colors ${
              mode === "nlp" ? tabActive : tabInactive
            }`}
          >
            <Sparkles size={14} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">NLP to Query</span>
              <span className={mode === "nlp" ? "text-blue-100" : muted}>
                Ask in natural language
              </span>
            </div>
          </button>
          <button
            onClick={() => onModeChange("manual")}
            className={`flex items-start gap-2 px-3 py-2 rounded border text-left text-xs transition-colors ${
              mode === "manual" ? tabActive : tabInactive
            }`}
          >
            <Code2 size={14} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Manual SPARQL</span>
              <span className={mode === "manual" ? "text-blue-100" : muted}>
                Write SPARQL
              </span>
            </div>
          </button>
        </div>

        {/* Saved bookmarks — bottom-left of QueryPanel */}
        <div className="flex flex-col gap-1 mt-auto pt-2">
          <div className="flex items-center justify-between">
            <span className={sectionLabel}>Saved Queries</span>
            <span className={`text-[10px] tabular-nums ${muted}`}>
              {bookmarksLoading ? "…" : bookmarks.length}
            </span>
          </div>
          {!bookmarksLoading && bookmarks.length === 0 && (
            <p className={`text-[11px] ${muted} italic px-1 py-2`}>
              ยังไม่มี bookmark — กดปุ่ม Save ที่ editor เพื่อบันทึก query แรก
            </p>
          )}
          <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
            {bookmarks.map((b) => {
              const isMenuOpen = openMenuId === b.id;
              return (
                <li key={b.id}>
                  <div
                    className={`group rounded border px-2 py-1.5 ${
                      isDark
                        ? "border-slate-700 bg-slate-950 hover:bg-slate-800"
                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <button
                        onClick={() => onLoadBookmark(b)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className={`text-xs font-semibold truncate ${heading}`}>
                          {b.name}
                        </div>
                        <div className={`text-[9px] mt-0.5 ${muted}`}>
                          {new Date(b.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        data-bookmark-kebab={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isMenuOpen) {
                            onOpenMenu(null);
                            setMenuPos(null);
                            return;
                          }
                          const rect = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          const top = rect.bottom + 4;
                          const left = Math.max(
                            8,
                            Math.min(
                              window.innerWidth - MENU_WIDTH - 8,
                              rect.right - MENU_WIDTH,
                            ),
                          );
                          setMenuPos({ top, left });
                          onOpenMenu(b.id);
                        }}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-label="Bookmark actions"
                        className={`p-1 rounded shrink-0 transition-opacity ${
                          isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        } ${
                          isDark
                            ? "text-slate-300 hover:bg-slate-700"
                            : "text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Floating kebab dropdown — position: fixed, anchored to clicked kebab. */}
      {openBookmark && menuPos && (
        <div
          role="menu"
          data-bookmark-popup
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: MENU_WIDTH,
            zIndex: 9999,
          }}
          className={`rounded-md border shadow-lg py-1 ${
            isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
          }`}
        >
          <MenuItem
            isDark={isDark}
            icon={<Pencil size={12} />}
            label="Rename"
            onClick={() => onRenameBookmark(openBookmark)}
          />
          <MenuItem
            isDark={isDark}
            icon={<FileCode2 size={12} />}
            label="Edit Query"
            onClick={() => onEditBookmark(openBookmark)}
          />
          <div
            className={`my-1 border-t ${
              isDark ? "border-slate-700" : "border-gray-200"
            }`}
          />
          <MenuItem
            isDark={isDark}
            icon={<Trash2 size={12} />}
            label="Delete"
            danger
            onClick={() => onDeleteBookmark(openBookmark.id)}
          />
        </div>
      )}
    </aside>
  );
}

function NLPPlaceholder({ isDark }: { isDark: boolean }) {
  const card = isDark
    ? "bg-slate-800 border-slate-700"
    : "bg-white border-gray-200";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400";
  const banner = isDark
    ? "bg-amber-900/30 border-amber-800 text-amber-200"
    : "bg-amber-50 border-amber-200 text-amber-900";
  const ghost = isDark
    ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed"
    : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
  const readOnlyBg = isDark
    ? "bg-slate-950 border-slate-800 text-slate-500"
    : "bg-gray-50 border-gray-200 text-gray-400";

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-auto">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-blue-600" />
        <h2 className={`text-base font-bold ${heading}`}>Ask in Natural Language</h2>
      </div>
      <div className={`flex flex-col gap-2 rounded-lg border p-3 ${card}`}>
        <label className={`text-xs font-semibold ${subtle}`}>Your question</label>
        <textarea
          rows={3}
          placeholder="e.g. ยา Aspirin มาจากบริษัทไหนและมีรหัส UNII คืออะไร?"
          className={`resize-y min-h-[80px] px-3 py-2 rounded border text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
        />
        <div className="flex justify-end">
          <button
            disabled
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium border ${ghost}`}
          >
            <Wand2 size={14} />
            Generate SPARQL
          </button>
        </div>
      </div>

      <div className={`flex flex-col gap-2 rounded-lg border p-3 ${card}`}>
        <label className={`text-xs font-semibold ${subtle}`}>Generated SPARQL</label>
        <pre
          className={`min-h-[120px] px-3 py-2 rounded border text-xs font-mono leading-relaxed ${readOnlyBg}`}
        >
          {`# Generated SPARQL will appear here.`}
        </pre>
        <div className="flex justify-end">
          <button
            disabled
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium border ${ghost}`}
          >
            <Play size={14} />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  isDark,
  icon,
  label,
  danger,
  onClick,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  const base = "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left";
  const cls = danger
    ? isDark
      ? "text-red-400 hover:bg-red-900/30"
      : "text-red-600 hover:bg-red-50"
    : isDark
      ? "text-slate-200 hover:bg-slate-800"
      : "text-gray-700 hover:bg-gray-100";
  return (
    <button role="menuitem" onClick={onClick} className={`${base} ${cls}`}>
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
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
