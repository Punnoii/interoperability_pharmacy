"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Loader2, Network, Play, Sparkles, X } from "lucide-react";

interface SubstanceSimilarityProps {
  isDark: boolean;
}

interface Concept {
  iri: string;
  name: string;
  identifier?: string;
}

interface PairScore {
  a: Concept;
  b: Concept;
  score: number;
  reasons: string[];
}

interface SparqlBindingValue {
  type: string;
  value: string;
}
type SparqlBinding = Record<string, SparqlBindingValue>;
interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

const DEFAULT_QUERY = `PREFIX idmp-mprd: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>

SELECT ?substance ?name ?identifier WHERE {
  ?substance a idmp-mprd:MedicinalProduct ;
             cmns-dsg:hasName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-mprd:hasFullMedicinalProductName ?name .
  ?i cmns-txt:hasTextValue ?identifier .
}
LIMIT 150
`;

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9ก-๙\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

function trigrams(s: string): Set<string> {
  const set = new Set<string>();
  const padded = `  ${s.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "")}  `;
  if (padded.length < 3) return set;
  for (let i = 0; i <= padded.length - 3; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function nameSimilarity(a: string, b: string, tokensA: Set<string>, tokensB: Set<string>): number {
  const word = jaccard(tokensA, tokensB);
  const char = jaccard(trigrams(a), trigrams(b));
  return Math.max(word, char * 0.85);
}

function shortIri(iri: string): string {
  if (!iri) return "";
  return iri.split("/").pop() ?? iri.split("#").pop() ?? iri;
}

function bindingsToConcepts(bindings: SparqlBinding[]): Concept[] {
  const seen = new Set<string>();
  const out: Concept[] = [];
  for (const b of bindings) {
    const iriKey = b.substance?.value ?? b.s?.value ?? b.x?.value;
    const nameKey = b.name?.value ?? b.nameValue?.value ?? b.label?.value;
    if (!iriKey) continue;
    if (seen.has(iriKey)) continue;
    seen.add(iriKey);
    out.push({
      iri: iriKey,
      name: nameKey ?? shortIri(iriKey),
      identifier: b.identifier?.value ?? b.identifierValue?.value,
    });
  }
  return out;
}

function computePairs(items: Concept[]): PairScore[] {
  const out: PairScore[] = [];
  const tokens = items.map((c) => tokenize(c.name));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const reasons: string[] = [];
      let score = 0;

      const sameId =
        a.identifier && b.identifier && a.identifier === b.identifier;

      if (sameId) {
        score = 1.0;
        reasons.push("Shared identifier");
      } else {
        const sameName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
        const ns = nameSimilarity(a.name, b.name, tokens[i], tokens[j]);

        if (sameName) {
          score = 0.9;
          reasons.push("Same name");
        } else if (ns >= 0.5) {
          score = 0.5 + ns * 0.3;
          reasons.push(`Name similarity ${Math.round(ns * 100)}%`);
        } else if (ns > 0) {
          score = ns * 0.6;
          reasons.push(`Name similarity ${Math.round(ns * 100)}%`);
        }
      }

      if (score > 0.05) {
        out.push({ a, b, score: Number(score.toFixed(4)), reasons });
      }
    }
  }
  out.sort((p, q) => q.score - p.score);
  return out;
}

export default function SubstanceSimilarity({ isDark }: SubstanceSimilarityProps) {
  const [sparql, setSparql] = useState(DEFAULT_QUERY);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [picked, setPicked] = useState<PairScore | null>(null);

  async function runQuery() {
    if (!sparql.trim() || running) return;
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/sparql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: sparql,
          accept: "application/sparql-results+json",
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`);
        return;
      }
      const data: SparqlResults = await res.json();
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  const concepts = useMemo(() => {
    if (!results) return [];
    return bindingsToConcepts(results.results?.bindings ?? []);
  }, [results]);

  const pairs = useMemo(() => computePairs(concepts), [concepts]);
  const visible = useMemo(() => pairs.filter((p) => p.score >= threshold), [pairs, threshold]);

  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const card = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const codeBg = isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-gray-50 border-gray-200 text-gray-800";
  const inputCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";

  return (
    <div className="flex flex-col h-full p-6 overflow-auto gap-5">
      <div className="flex items-center gap-3">
        <div>
          <h2 className={`text-xl font-bold ${heading}`} style={{ fontFamily: "Georgia, serif" }}>
            Query Similarity
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
          <label className={`text-sm font-semibold ${subtle}`}>Enter SPARQL Query</label>
          <textarea
            value={sparql}
            onChange={(e) => setSparql(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                runQuery();
              }
            }}
            rows={12}
            spellCheck={false}
            className={`w-full px-3 py-2 rounded border text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${codeBg}`}
          />
          <button
            onClick={runQuery}
            disabled={running || !sparql.trim()}
            className="self-start flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{running ? "Running..." : "SEND QUERY"}</span>
          </button>
        </div>

        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <label className={`text-sm font-semibold ${subtle}`}>Explanation Section</label>
            <span className={`text-[10px] ${muted}`}>
              {visible.length} / {pairs.length} pairs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className={`text-xs ${muted} shrink-0`}>Similarity Threshold:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="range-slider flex-1"
            />
            <span className={`text-xs font-mono tabular-nums w-12 text-right ${heading}`}>
              {threshold.toFixed(2)}
            </span>
          </div>

          <div
            style={{ height: 320 }}
            className={`overflow-y-auto rounded-md ${codeBg}`}
          >
            {visible.length === 0 ? (
              <p className={`text-xs italic p-4 ${muted}`}>
                {pairs.length === 0
                  ? "Run a query to fetch multiple substances first"
                  : `${threshold.toFixed(2)} try moving the slider down or running a different query`}
              </p>
            ) : (
              <ul className="divide-y divide-current/10">
                {visible.map((p, i) => (
                  <li key={`${p.a.iri}-${p.b.iri}-${i}`}>
                    <button
                      onClick={() => setPicked(p)}
                      className={`w-full text-left px-3 py-2 hover:bg-blue-500/10 transition-colors ${
                        isDark ? "" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">
                          {p.a.name} / {p.b.name}
                        </span>
                        <span className="font-mono tabular-nums text-xs shrink-0">
                          {p.score.toFixed(4)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${card}`}>
        <div className="flex items-center justify-between mb-2">
          <label className={`text-sm font-semibold ${subtle}`}>Query Result</label>
          {results && (
            <span className={`text-[10px] ${muted}`}>
              {results.results?.bindings?.length ?? 0} bindings · {concepts.length} unique concepts
            </span>
          )}
        </div>

        {error && (
          <div className={`text-xs ${isDark ? "text-red-300" : "text-red-600"} mb-2 font-mono`}>
            {error}
          </div>
        )}

        {!results && !error && (
          <p className={`text-xs italic ${muted}`}>SEND QUERY FOR WATCHING RESULTS</p>
        )}

        {results && concepts.length > 0 && (
          <pre className={`text-xs font-mono leading-relaxed overflow-auto p-2 rounded max-h-[480px] ${codeBg}`}>
            {`Output: ${results.head.vars.join(", ")}\n`}
            {concepts.map((c) => `Output: ${c.iri}${c.name ? ` (${c.name})` : ""}\n`).join("")}
          </pre>
        )}
      </div>

      {picked && (
        <SimilarityDetailsModal pair={picked} onClose={() => setPicked(null)} isDark={isDark} />
      )}
    </div>
  );
}

interface AttributeRow {
  key: string;
  label: string;
  valueA: string;
  valueB: string;
  matched: boolean;
  mono?: boolean;
  context?: boolean;
}

function getAttributes(pair: PairScore): AttributeRow[] {
  const a = pair.a;
  const b = pair.b;
  const tokensA = tokenize(a.name);
  const tokensB = tokenize(b.name);
  const sharedWords = [...tokensA].filter((t) => tokensB.has(t));
  const wordPct = Math.round(jaccard(tokensA, tokensB) * 100);
  const trA = trigrams(a.name);
  const trB = trigrams(b.name);
  const sharedTrigrams = [...trA].filter((t) => trB.has(t));
  const charPct = Math.round(jaccard(trA, trB) * 100);

  return [
    {
      key: "name",
      label: "Name",
      valueA: a.name,
      valueB: b.name,
      matched: a.name.trim().toLowerCase() === b.name.trim().toLowerCase(),
    },
    {
      key: "identifier",
      label: "Identifier",
      valueA: a.identifier ?? "—",
      valueB: b.identifier ?? "—",
      matched: !!a.identifier && !!b.identifier && a.identifier === b.identifier,
      mono: true,
    },
    {
      key: "word-tokens",
      label: "Word tokens",
      valueA: tokensA.size > 0 ? [...tokensA].join(", ") : "—",
      valueB: tokensB.size > 0 ? [...tokensB].join(", ") : "—",
      matched: false,
      mono: true,
      context: true,
    },
    {
      key: "word-overlap",
      label: "Word overlap",
      valueA: sharedWords.length > 0 ? sharedWords.join(", ") : "(none)",
      valueB: `${sharedWords.length}/${tokensA.size + tokensB.size - sharedWords.length} = ${wordPct}%`,
      matched: false,
      mono: true,
      context: true,
    },
    {
      key: "char-trigram",
      label: "Char trigrams shared",
      valueA: sharedTrigrams.length > 0
        ? sharedTrigrams.map((t) => `"${t}"`).join(", ")
        : "(none)",
      valueB: `${sharedTrigrams.length}/${trA.size + trB.size - sharedTrigrams.length} = ${charPct}%`,
      matched: false,
      mono: true,
      context: true,
    },
    {
      key: "iri",
      label: "IRI",
      valueA: a.iri,
      valueB: b.iri,
      matched: a.iri === b.iri,
      mono: true,
      context: true,
    },
  ];
}

function SimilarityDetailsModal({
  pair,
  onClose,
  isDark,
}: {
  pair: PairScore;
  onClose: () => void;
  isDark: boolean;
}) {
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const cardBg = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const attrs = getAttributes(pair);
  const criteria = attrs.filter((r) => !r.context);
  const matchedCount = criteria.filter((r) => r.matched).length;
  const totalCriteria = criteria.length;

  const diffBg = isDark ? "bg-slate-950/40" : "bg-gray-50/60";
  const colBorder = isDark ? "border-slate-800/60" : "border-gray-200/80";

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden ${cardBg}`}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${colBorder}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? "bg-blue-900/40" : "bg-blue-50"
            }`}>
              <Network size={18} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-base font-bold ${heading}`}>Substance Comparison</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              aria-label="Close"
              className={`p-1.5 rounded ${
                isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-[160px_1fr_1fr] border-b ${colBorder}`}>
          <div className={`px-5 py-3 ${diffBg}`}>
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${muted}`}>
              Attribute
            </p>
          </div>
          <div className={`px-5 py-3 border-l ${colBorder}`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? "bg-blue-900/30 text-blue-300" : "bg-blue-50 text-blue-600"
              }`}>
                <FlaskConical size={14} />
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Substance A</p>
                <p className={`text-sm font-bold truncate ${heading}`} title={pair.a.name}>
                  {pair.a.name}
                </p>
                <p className={`text-[10px] font-mono truncate ${muted}`} title={pair.a.iri}>
                  {shortIri(pair.a.iri)}
                </p>
              </div>
            </div>
          </div>
          <div className={`px-5 py-3 border-l ${colBorder}`}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? "bg-purple-900/30 text-purple-300" : "bg-purple-50 text-purple-600"
              }`}>
                <FlaskConical size={14} />
              </div>
              <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wider ${muted}`}>Substance B</p>
                <p className={`text-sm font-bold truncate ${heading}`} title={pair.b.name}>
                  {pair.b.name}
                </p>
                <p className={`text-[10px] font-mono truncate ${muted}`} title={pair.b.iri}>
                  {shortIri(pair.b.iri)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          {attrs.map((row, i) => {
            const isLast = i === attrs.length - 1;
            const labelColor = row.context ? muted : subtle;
            const valueCls = `${row.context ? "text-xs" : "text-sm"} break-words ${subtle} ${row.mono ? "font-mono leading-snug" : ""}`;
            return (
              <div
                key={row.key}
                className={`px-5 ${isLast ? "pt-3 pb-7" : "py-3"} ${
                  !isLast ? `border-b ${colBorder}` : ""
                }`}
              >
                <p className={`text-[11px] tracking-wide mb-1.5 ${labelColor}`}>
                  {row.label}
                </p>
                <p className={valueCls} title={row.valueA}>
                  {row.valueA}
                </p>
                <p className={valueCls} title={row.valueB}>
                  {row.valueB}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
