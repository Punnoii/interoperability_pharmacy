"use client";

import { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Search,
  X,
  Layers,
  Tag,
  Database,
  BookOpen,
} from "lucide-react";
import { themeClasses } from "@/lib/themeClasses";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

interface SubstanceSummary {
  iri: string;
  preferredName: string;
  substanceType: string;
  identifier: string;
  source: string;
}

interface NameEntry {
  value: string;
  type: string;
  languageCode: string;
}

interface IdentifierEntry {
  value: string;
}

interface WikidataSearchItem {
  qid: string;
  iri: string;
  label: string;
  description: string;
  source: string;
}

interface WikidataEnrichment {
  wikidataAvailable: boolean;
  items: WikidataSearchItem[];
}

interface SubstanceDetail {
  iri: string;
  substanceType: string;
  names: NameEntry[];
  identifiers: IdentifierEntry[];
  wikidata: WikidataEnrichment | null;
}

interface CrossSourceResult {
  iri: string;
  preferredName: string;
  substanceType: string;
  source: string;
  matchedIdentifier: string;
}

interface SubstancePanelProps {
  isDark: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  "company_a": "bg-blue-100 text-blue-800",
  "company_b": "bg-purple-100 text-purple-800",
  "company_c": "bg-green-100 text-green-800",
  "company_d": "bg-orange-100 text-orange-800",
  "company_e": "bg-pink-100 text-pink-800",
};

const SOURCE_COLORS_DARK: Record<string, string> = {
  "company_a": "bg-blue-900/40 text-blue-300",
  "company_b": "bg-purple-900/40 text-purple-300",
  "company_c": "bg-green-900/40 text-green-300",
  "company_d": "bg-orange-900/40 text-orange-300",
  "company_e": "bg-pink-900/40 text-pink-300",
};

function sourceColor(source: string, dark: boolean) {
  const map = dark ? SOURCE_COLORS_DARK : SOURCE_COLORS;
  const key = source.toLowerCase().replace(/\s+/g, "_");
  return map[key] ?? (dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-700");
}

export default function SubstancePanel({ isDark }: SubstancePanelProps) {
  const [substances, setSubstances] = useState<SubstanceSummary[]>([]);
  const [filtered, setFiltered] = useState<SubstanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SubstanceSummary | null>(null);
  const [detail, setDetail] = useState<SubstanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [crossResults, setCrossResults] = useState<CrossSourceResult[]>([]);
  const [crossLoading, setCrossLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [hasSearched, setHasSearched] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchSubstances(keyword: string) {
    setLoading(true);
    setError(null);
    try {
      const url = keyword
        ? `/api/substances?search=${encodeURIComponent(keyword)}`
        : `/api/substances`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SubstanceSummary[] = await res.json();
      setSubstances(data);
      setFiltered(data);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setSubstances([]);
      setFiltered([]);
      setHasSearched(false);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setHasSearched(true);
      fetchSubstances(val.trim());
    }, 400);
  }, []);

  async function selectSubstance(s: SubstanceSummary) {
    setSelected(s);
    setDetail(null);
    setCrossResults([]);
    setDetailLoading(true);
    setCrossLoading(true);

    try {
      const res = await fetch(`${routes.substancesDetails}?iri=${encodeURIComponent(s.iri)}`);
      if (res.ok) setDetail(await res.json());
    } catch {
    } finally {
      setDetailLoading(false);
    }

    if (s.identifier) {
      try {
        const res = await fetch(
          `/api/substances/cross-source?identifier=${encodeURIComponent(s.identifier)}`
        );
        if (res.ok) setCrossResults(await res.json());
      } catch {
      } finally {
        setCrossLoading(false);
      }
    } else {
      setCrossLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tc = themeClasses(isDark);
  const card = tc.surface;
  const muted = tc.muted;
  const subtle = tc.subtle;
  const inputCls = isDark
    ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
  const rowHover = isDark ? "hover:bg-slate-700/40" : "hover:bg-blue-50/60";
  const rowActive = isDark ? "bg-blue-900/30 border-l-2 border-blue-400" : "bg-blue-50 border-l-2 border-blue-500";
  const divider = isDark ? "border-slate-700" : "border-gray-200";

  return (
    <div className="flex h-full overflow-hidden gap-0">
      <div className={`flex flex-col w-[420px] shrink-0 border-r ${divider}`}>
        <div className={`px-4 py-3 border-b ${divider}`}>
          <div className="relative">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search substances..."
              className={`w-full pl-9 pr-8 py-2 rounded-md border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); fetchSubstances(""); }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <p className={`text-xs mt-2 ${muted}`}>
            {loading ? "Loading..." : `${filtered.length.toLocaleString()} substances`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center items-center h-32">
              <Loader2 size={22} className="animate-spin text-blue-500" />
            </div>
          )}
          {error && (
            <div className="p-4 text-sm text-red-500">Error: {error}</div>
          )}
          {!loading && !error && pageItems.length === 0 && (
            <div className={`flex flex-col items-center justify-center h-32 text-sm ${muted}`}>
              {hasSearched ? "No substances found" : "Type to search substances"}
            </div>
          )}
          {!loading && !error && pageItems.map((s) => (
            <button
              key={s.iri}
              onClick={() => selectSubstance(s)}
              className={`w-full text-left px-4 py-3 border-b transition-colors ${divider} ${selected?.iri === s.iri ? rowActive : rowHover}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-sm font-medium truncate ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                  {s.preferredName || "(No Name)"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${sourceColor(s.source, isDark)}`}>
                  {s.source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono truncate ${muted}`}>{s.identifier}</span>
                {s.substanceType && (
                  <span className={`text-xs ${muted}`}>· {s.substanceType.split("/").pop()}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${divider} ${muted}`}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="disabled:opacity-40 hover:text-blue-500"
            >
              ← Prev
            </button>
            <span>{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="disabled:opacity-40 hover:text-blue-500"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selected && (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${muted}`}>
            <Database size={48} strokeWidth={1.2} />
            <p className="text-base font-medium">Select a substance</p>
            <p className="text-sm">Click any item on the left to view details</p>
          </div>
        )}

        {selected && (
          <div className="flex flex-col gap-5 max-w-2xl">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                  {selected.preferredName || "(No Name)"}
                </h2>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${sourceColor(selected.source, isDark)}`}>
                  {selected.source}
                </span>
              </div>
              <a
                href={selected.iri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1 font-mono"
              >
                {selected.iri} <ExternalLink size={11} />
              </a>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-blue-500" />
              </div>
            ) : detail ? (
              <>
                {detail.names?.length > 0 && (
                  <Section title="Names" icon={<BookOpen size={15} />} isDark={isDark}>
                    <div className="flex flex-wrap gap-2">
                      {detail.names.map((n, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded border ${isDark ? "border-slate-600 text-slate-300 bg-slate-800" : "border-gray-200 text-gray-700 bg-gray-50"}`}
                          title={`${n.type}${n.languageCode ? ` [${n.languageCode}]` : ""}`}
                        >
                          {n.value}
                          {n.languageCode && <span className={`ml-1 ${muted}`}>[{n.languageCode}]</span>}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {detail.identifiers?.length > 0 && (
                  <Section title="Identifiers" icon={<Tag size={15} />} isDark={isDark}>
                    <div className="flex flex-wrap gap-2">
                      {detail.identifiers.map((id, i) => (
                        <span
                          key={i}
                          className={`text-xs font-mono px-2 py-1 rounded border ${isDark ? "border-slate-600 text-slate-300 bg-slate-900" : "border-gray-300 text-gray-700 bg-gray-50"}`}
                        >
                          {id.value}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {detail.wikidata?.wikidataAvailable && detail.wikidata.items?.length > 0 && (
                  <Section title="Wikidata Enrichment" icon={<ExternalLink size={15} />} isDark={isDark}>
                    <div className="flex flex-col gap-3">
                      {detail.wikidata.items.map((item, idx) => (
                        <div key={idx} className={`rounded-lg p-3 border ${isDark ? "border-slate-700 bg-slate-900/50" : "border-blue-100 bg-blue-50/50"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-gray-900"}`}>
                                {item.label}
                              </p>
                              {item.description && (
                                <p className={`text-xs mt-1 ${muted}`}>{item.description}</p>
                              )}
                              <span className={`text-xs font-mono mt-1 inline-block ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                {item.qid}
                              </span>
                            </div>
                            <a
                              href={item.iri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-blue-500 hover:text-blue-600"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            ) : null}

            <Section title="Cross-Source Lookup" icon={<Layers size={15} />} isDark={isDark}>
              {crossLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                  <span className={`text-xs ${muted}`}>Looking up across sources…</span>
                </div>
              ) : crossResults.length === 0 ? (
                <p className={`text-xs ${muted}`}>
                  {selected.identifier ? "No matches found in other sources." : "No identifier available for cross-source lookup."}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className={`text-xs ${muted} mb-1`}>
                    Found in {crossResults.length} source{crossResults.length !== 1 ? "s" : ""} with identifier{" "}
                    <code className={`font-mono ${isDark ? "text-blue-400" : "text-blue-600"}`}>{selected.identifier}</code>
                  </p>
                  {crossResults.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-md px-3 py-2 border ${isDark ? "border-slate-700 bg-slate-900/40" : "border-gray-200 bg-gray-50"}`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-gray-800"}`}>
                          {r.preferredName}
                        </p>
                        <p className={`text-xs ${muted}`}>{r.substanceType?.split("/").pop()}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sourceColor(r.source, isDark)}`}>
                        {r.source}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  isDark,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border ${isDark ? "border-slate-700" : "border-gray-200"}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg ${isDark ? "text-slate-300 bg-slate-800/60 hover:bg-slate-800" : "text-gray-700 bg-gray-50 hover:bg-gray-100"}`}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        {title}
      </button>
      {open && (
        <div className={`px-4 py-3 rounded-b-lg ${isDark ? "bg-slate-800/30" : "bg-white"}`}>
          {children}
        </div>
      )}
    </div>
  );
}
