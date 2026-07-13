"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { ArrowLeft, Bookmark, FlaskConical, Loader2, Play, Search, Sparkles, X, Zap } from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type QueryTemplate,
  type TemplateCategory,
} from "@/lib/queryTemplates";
import { hybridScore } from "@/lib/textSimilarity";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

// one row from the substance quick-search endpoint; unii is the shown badge, iri fills template params
export interface SubstanceHit {
  iri: string;
  name: string;
  unii: string;
}

// slimmed-down bookmark — palette only needs enough to list + apply
interface BookmarkLite {
  id: string;
  name: string;
  query: string;
}

interface QuickSearchProps {
  isDark: boolean;
  templates: QueryTemplate[];
  bookmarks: BookmarkLite[];
  onClose: () => void;
  onApply: (query: string, run: boolean) => void;
}

// swap every {{TOKEN}} in the template query for the user's value (or the param default)
function fillTokens(template: QueryTemplate, values: Record<string, string>): string {
  let out = template.query;
  for (const param of template.params ?? []) {
    out = out.split(param.token).join(values[param.token] ?? param.defaultValue);
  }
  return out;
}

// the ⌘K command palette: fuzzy-search substances + templates + saved queries, then insert or run
export default function QuickSearch({ isDark, templates, bookmarks, onClose, onApply }: QuickSearchProps) {
  const [term, setTerm] = useState("");
  const [debounced] = useDebounce(term, 200);
  const [hits, setHits] = useState<SubstanceHit[]>([]);
  const [hitsLoading, setHitsLoading] = useState(false);
  // picked = a template chosen that needs param input; null means we're on the search list
  const [picked, setPicked] = useState<QueryTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // grab focus on open, and again when we drop back to the search view from the param form
  useEffect(() => {
    inputRef.current?.focus();
  }, [picked]);

  // esc backs out of the param form first, then closes the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (picked) setPicked(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, picked]);

  // live substance lookup while typing on the search view; skipped once a template is picked
  useEffect(() => {
    if (picked || debounced.trim().length < 2) {
      setHits([]);
      return;
    }
    // abort the in-flight request if the term changes before it lands (avoids stale results)
    const ctrl = new AbortController();
    setHitsLoading(true);
    fetch(`${routes.substancesQuickSearch}?q=${encodeURIComponent(debounced.trim())}&limit=6`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setHits(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setHitsLoading(false));
    return () => ctrl.abort();
  }, [debounced, picked]);

  // templates fuzzy-matched against name/description/keywords, grouped into category sections
  const grouped = useMemo(() => {
    const w = term.trim().toLowerCase();
    // best score across name/desc/keywords; short/empty term shows everything (score 1)
    const match = (t: QueryTemplate) => {
      if (w.length < 2) return 1;
      return Math.max(
        hybridScore(w, t.name),
        hybridScore(w, t.description),
        ...t.keywords.map((k) => hybridScore(w, k)),
      );
    };
    const out: Array<{ category: TemplateCategory; items: QueryTemplate[] }> = [];
    // walk categories in a fixed order so sections don't jump around as scores change
    for (const category of CATEGORY_ORDER) {
      const items = templates
        .filter((t) => (t.category ?? "explore") === category)
        .map((t) => ({ t, s: match(t) }))
        .filter((x) => x.s >= 0.25)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.t);
      if (items.length > 0) out.push({ category, items });
    }
    return out;
  }, [term, templates]);

  // saved queries matching the term; with no term just show a few recents
  const matchedBookmarks = useMemo(() => {
    const w = term.trim().toLowerCase();
    if (w.length < 2) return bookmarks.slice(0, 3);
    return bookmarks.filter((b) => hybridScore(w, b.name) >= 0.3).slice(0, 4);
  }, [term, bookmarks]);

  // param-less templates apply straight away; ones with params open the fill-in form instead
  const openTemplate = useCallback((t: QueryTemplate) => {
    if (!t.params || t.params.length === 0) {
      onApply(t.query, false);
      onClose();
      return;
    }
    const initial: Record<string, string> = {};
    for (const p of t.params) initial[p.token] = p.defaultValue;
    setValues(initial);
    setPicked(t);
    setTerm("");
  }, [onApply, onClose]);

  // theme class bundles reused across the two views
  const panel = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const text = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const divide = isDark ? "border-slate-800" : "border-gray-200";
  const rowHover = isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";
  const inputCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400";
  const badge = isDark ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500";

  return (
    // dimmed backdrop; click-through closes, card stops propagation below
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] bg-black/50" onClick={onClose} role="presentation">
      <div
        className={`w-full max-w-2xl max-h-[78vh] flex flex-col rounded-xl border shadow-2xl ${panel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
      >
        {/* two faces of the palette: the param-fill form (picked) vs the search list */}
        {picked ? (
          <>
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${divide}`}>
              <button onClick={() => setPicked(null)} aria-label="Back" className={`p-1 rounded ${rowHover} ${muted}`}>
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${text}`}>{picked.name}</p>
                <p className={`text-xs truncate ${muted}`}>{picked.description}</p>
              </div>
              <button onClick={onClose} aria-label="Close" className={`p-1 rounded ${rowHover} ${muted}`}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
              {/* one field per param — substance params get the autocomplete widget, others a plain input */}
              {picked.params?.map((p) =>
                p.kind === "substance" ? (
                  <SubstanceField
                    key={p.token}
                    isDark={isDark}
                    label={p.label}
                    placeholder={p.placeholder}
                    value={values[p.token] ?? ""}
                    onChange={(iri) => setValues((v) => ({ ...v, [p.token]: iri }))}
                  />
                ) : (
                  <div key={p.token} className="flex flex-col gap-1">
                    <label className={`text-xs font-semibold ${subtle}`}>{p.label}</label>
                    <input
                      value={values[p.token] ?? ""}
                      placeholder={p.placeholder}
                      onChange={(e) => setValues((v) => ({ ...v, [p.token]: e.target.value }))}
                      className={`text-sm px-3 py-2 rounded border outline-none focus:border-blue-500 ${inputCls}`}
                    />
                  </div>
                ),
              )}
              {picked.estSeconds != null && picked.estSeconds >= 10 && (
                <p className={`text-xs ${muted}`}>
                  This query typically takes about {picked.estSeconds} seconds against the live federation.
                </p>
              )}
            </div>

            {/* insert drops the filled query into the editor; run now fires it immediately */}
            <div className={`flex items-center justify-end gap-2 px-4 py-3 border-t ${divide}`}>
              <button
                onClick={() => { onApply(fillTokens(picked, values), false); onClose(); }}
                className={`text-sm px-3 py-2 rounded border ${isDark ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                Insert into editor
              </button>
              <button
                onClick={() => { onApply(fillTokens(picked, values), true); onClose(); }}
                className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
              >
                <Play size={14} />
                <span>Run now</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`flex items-center gap-2 px-4 py-3 border-b ${divide}`}>
              <Search size={16} className={muted} />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search substances or query templates…"
                className={`flex-1 bg-transparent text-sm outline-none ${text} ${isDark ? "placeholder:text-slate-500" : "placeholder:text-gray-400"}`}
              />
              {hitsLoading && <Loader2 size={14} className={`animate-spin ${muted}`} />}
              <button onClick={onClose} aria-label="Close" className={`p-1 rounded ${rowHover} ${muted}`}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-auto py-2">
              {/* substance hits: picking one jumps into the full-profile template pre-seeded with its IRI */}
              {hits.length > 0 && (
                <Section isDark={isDark} title="Substances" icon={<FlaskConical size={12} />}>
                  {hits.map((h) => (
                    <button
                      key={`${h.unii}:${h.name}`}
                      onClick={() => {
                        // prefer the full-profile template, else any template that takes a substance
                        const t = templates.find((x) => x.id === "tpl-substance-full-profile") ?? templates.find((x) => x.params?.some((p) => p.kind === "substance"));
                        if (!t) return;
                        const initial: Record<string, string> = {};
                        for (const p of t.params ?? []) initial[p.token] = p.kind === "substance" ? h.iri : p.defaultValue;
                        setValues(initial);
                        setPicked(t);
                        setTerm("");
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left ${rowHover}`}
                    >
                      <span className={`text-sm truncate ${text}`}>{h.name}</span>
                      <span className={`text-[11px] font-mono shrink-0 px-1.5 py-0.5 rounded ${badge}`}>{h.unii}</span>
                    </button>
                  ))}
                </Section>
              )}

              {matchedBookmarks.length > 0 && (
                <Section isDark={isDark} title="Saved queries" icon={<Bookmark size={12} />}>
                  {matchedBookmarks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { onApply(b.query, false); onClose(); }}
                      className={`w-full px-4 py-2 text-left ${rowHover}`}
                    >
                      <span className={`text-sm truncate ${text}`}>{b.name}</span>
                    </button>
                  ))}
                </Section>
              )}

              {/* the template catalog, one Section per category */}
              {grouped.map(({ category, items }) => (
                <Section
                  key={category}
                  isDark={isDark}
                  title={CATEGORY_LABELS[category]}
                  icon={category === "crosssource" ? <Sparkles size={12} /> : <Zap size={12} />}
                >
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTemplate(t)}
                      className={`w-full flex items-start justify-between gap-3 px-4 py-2 text-left ${rowHover}`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-sm truncate ${text}`}>{t.name}</span>
                        <span className={`block text-xs truncate ${muted}`}>{t.description}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        {t.params && t.params.length > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge}`}>needs input</span>
                        )}
                        {t.estSeconds != null && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${badge}`}>~{t.estSeconds}s</span>
                        )}
                      </span>
                    </button>
                  ))}
                </Section>
              ))}

              {grouped.length === 0 && hits.length === 0 && !hitsLoading && (
                <div className={`text-center py-12 ${muted}`}>
                  <p className="text-sm font-medium">No matches</p>
                  <p className="text-xs mt-1">Try a substance name like “ibuprofen”, or a word like “atc”.</p>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-3 px-4 py-2 border-t text-[11px] ${divide} ${muted}`}>
              <span><kbd className="font-mono">Esc</kbd> close</span>
              <span><kbd className="font-mono">⌘K</kbd> open</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// labelled group header with an icon, wrapping a run of result rows
function Section({ isDark, title, icon, children }: { isDark: boolean; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const muted = isDark ? "text-slate-500" : "text-gray-400";
  return (
    <div className="mb-1">
      <div className={`flex items-center gap-1.5 px-4 py-1 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

// self-contained substance picker for a template param: type a name, pick a hit, emits its IRI upward
function SubstanceField({
  isDark,
  label,
  placeholder,
  value,
  onChange,
}: {
  isDark: boolean;
  label: string;
  placeholder: string;
  value: string;
  onChange: (iri: string) => void;
}) {
  // local search term is separate from the committed value (the IRI) shown at the bottom
  const [term, setTerm] = useState("");
  const [debounced] = useDebounce(term, 200);
  const [hits, setHits] = useState<SubstanceHit[]>([]);
  const [loading, setLoading] = useState(false);

  // same debounced + abortable lookup as the palette, scoped to this one field
  useEffect(() => {
    if (debounced.trim().length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`${routes.substancesQuickSearch}?q=${encodeURIComponent(debounced.trim())}&limit=6`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setHits(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced]);

  const text = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const inputCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400";
  const listCls = isDark ? "border-slate-700 bg-slate-950" : "border-gray-200 bg-white";
  const rowHover = isDark ? "hover:bg-slate-800" : "hover:bg-gray-50";

  return (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-semibold ${subtle}`}>{label}</label>
      <div className="relative">
        <input
          value={term}
          placeholder={placeholder}
          onChange={(e) => setTerm(e.target.value)}
          className={`w-full text-sm px-3 py-2 rounded border outline-none focus:border-blue-500 ${inputCls}`}
        />
        {loading && <Loader2 size={14} className={`animate-spin absolute right-3 top-2.5 ${muted}`} />}
        {hits.length > 0 && (
          <div className={`absolute z-10 left-0 right-0 mt-1 rounded border shadow-lg max-h-48 overflow-auto ${listCls}`}>
            {hits.map((h) => (
              <button
                key={`${h.unii}:${h.name}`}
                onClick={() => { onChange(h.iri); setTerm(""); setHits([]); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left ${rowHover}`}
              >
                <span className={`text-xs truncate ${text}`}>{h.name}</span>
                <span className={`text-[10px] font-mono shrink-0 ${muted}`}>{h.unii}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* shows the committed IRI (or a dash) so the user can see what got selected */}
      <p className={`text-[11px] font-mono truncate ${muted}`} title={value}>{value || "—"}</p>
    </div>
  );
}
