"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Search, X } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

// one hit from our /api/wikidata proxy, qid + the wikidata iri to link out to
export interface WikidataItem {
  qid: string;
  iri: string;
  label: string;
  description: string | null;
  source: string;
}

interface WikidataPopupProps {
  isDark: boolean;
  term: string;
  alternatives: string[];
  onClose: () => void;
}

// modal that looks up a table cell's text on wikidata; opened from a row click in QueryPanel
export default function WikidataPopup({ isDark, term, alternatives, onClose }: WikidataPopupProps) {
  // query is the term we're actually searching, starts as `term` but the alt chips swap it
  const [query, setQuery] = useState(term);
  const [items, setItems] = useState<WikidataItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // re-seed when parent hands us a different cell to look up
  useEffect(() => setQuery(term), [term]);

  // fetch the wikidata proxy; swallows nothing, sets error state instead so the body can show it
  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const res = await fetch(`${routes.wikidata}?q=${encodeURIComponent(q)}&limit=5`);
      if (!res.ok) {
        setError(`Wikidata lookup failed (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError("Could not reach Wikidata. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // re-run the lookup whenever query changes (chip click or new term)
  useEffect(() => {
    if (query.trim()) load(query.trim());
  }, [query, load]);

  // esc closes the whole popup
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // theme-dependent class bundles, picked once per render
  const panel = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const text = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const divide = isDark ? "border-slate-800" : "border-gray-200";
  const card = isDark ? "bg-slate-800/60 border-slate-700" : "bg-blue-50/50 border-blue-100";
  const chip = isDark
    ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100";
  const chipActive = isDark
    ? "bg-blue-900/50 border-blue-700 text-blue-200"
    : "bg-blue-50 border-blue-300 text-blue-700";

  return (
    // full-screen dimmed backdrop; click anywhere outside the card closes
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl border shadow-2xl ${panel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Wikidata lookup"
      >
        <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b ${divide}`}>
          <div className="min-w-0">
            <h3 className={`text-base font-bold flex items-center gap-2 ${text}`}>
              <Search size={16} className="text-blue-500 shrink-0" />
              <span>Wikidata</span>
            </h3>
            <p className={`text-xs mt-1 truncate ${muted}`} title={query}>
              Searching for <span className="font-mono">{query}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`p-1 rounded shrink-0 ${isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <X size={16} />
          </button>
        </div>

        {/* other searchable terms from the same row, click one to re-run the lookup against it */}
        {alternatives.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 px-5 py-3 border-b ${divide}`}>
            {alternatives.map((alt) => (
              <button
                key={alt}
                onClick={() => setQuery(alt)}
                title={alt}
                className={`text-[11px] px-2 py-1 rounded border max-w-[180px] truncate ${
                  alt === query ? chipActive : chip
                }`}
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {/* body is a little state machine: loading, error, empty, hits */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {loading && (
            <div className={`flex items-center justify-center py-10 ${muted}`}>
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-sm">Looking up Wikidata…</span>
            </div>
          )}

          {!loading && error && (
            <div className={`text-sm px-3 py-3 rounded border ${isDark ? "text-red-300 border-red-900/50 bg-red-950/30" : "text-red-600 border-red-200 bg-red-50"}`}>
              {error}
            </div>
          )}

          {!loading && !error && items?.length === 0 && (
            <div className={`text-center py-10 ${muted}`}>
              <p className="text-sm font-medium">No Wikidata match</p>
              <p className="text-xs mt-1">Nothing found for “{query}”. Try another value above.</p>
            </div>
          )}

          {!loading && !error && items && items.length > 0 && (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.qid} className={`rounded-lg p-3 border ${card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${text}`}>{item.label}</p>
                      {item.description && (
                        <p className={`text-xs mt-1 ${subtle}`}>{item.description}</p>
                      )}
                      <span className="text-xs font-mono mt-1 inline-block text-blue-600 dark:text-blue-400">
                        {item.qid}
                      </span>
                    </div>
                    <a
                      href={item.iri}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.label} on Wikidata`}
                      className={`p-1 rounded shrink-0 ${isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-white"}`}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
