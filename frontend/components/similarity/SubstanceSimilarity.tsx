"use client";

import { useEffect, useMemo, useState } from "react";
import { Atom, ChevronDown, ChevronRight, FlaskConical, GitCompare, Loader2, Network, Play, Search, Tags, X } from "lucide-react";
import jaccard from "talisman/metrics/jaccard";
import ngrams from "talisman/tokenizers/ngrams";
import { nameSimilarity } from "@/lib/textSimilarity";
import { APP_CONFIG } from "@/lib/config";
import { themeClasses } from "@/lib/themeClasses";
import { truncate } from "@/lib/format";
import { useUserPreferences } from "@/lib/userPreferences";

const { routes } = APP_CONFIG.api;

// lowercase word tokens, keeping latin + thai chars; drops 1-char noise. used for name Jaccard
const wordTokens = (s: string): string[] =>
  s.toLowerCase().replace(/[^a-z0-9ก-๙\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);

// character 3-grams for the fuzzier name-overlap metric; needs at least 3 chars to produce any
const charTrigrams = (s: string): string[] => {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  return cleaned.length >= 3 ? (ngrams(3, cleaned) as string[]) : [];
};

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

// tail segment of an IRI for display
function shortIri(iri: string): string {
  if (!iri) return "";
  return iri.split("/").pop() ?? iri.split("#").pop() ?? iri;
}

// flatten SPARQL rows into unique concepts, tolerating a few different variable names for
// the iri/name/identifier columns (substance|s|x, name|nameValue|label, ...)
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

// score every unordered pair of concepts. a shared identifier wins outright, else fall back to
// exact-name then fuzzy name similarity. only pairs above minDisplay are kept, sorted high-first.
function computePairs(items: Concept[]): PairScore[] {
  const { sharedId, sameName: sameNameScore, minDisplay } = APP_CONFIG.similarity.pairScore;
  const out: PairScore[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const reasons: string[] = [];
      let score = 0;

      const sameId =
        a.identifier && b.identifier && a.identifier === b.identifier;

      if (sameId) {
        score = sharedId;
        reasons.push("Shared identifier");
      } else {
        const sameName = a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
        const ns = nameSimilarity(a.name, b.name);

        if (sameName) {
          score = sameNameScore;
          reasons.push("Same name");
        } else if (ns > 0) {
          score = ns;
          reasons.push(`Name similarity ${Math.round(ns * 100)}%`);
        }
      }

      if (score > minDisplay) {
        out.push({ a, b, score: Number(score.toFixed(4)), reasons });
      }
    }
  }
  out.sort((p, q) => q.score - p.score);
  return out;
}

type SimMode = "name-id" | "substance";

const SIM_MODES: { value: SimMode; label: string; description: string }[] = [
  {
    value: "substance",
    label: "Substance Similarity",
    description: "Semantic similarity using ELH ontology (ATC)",
  },
  {
    value: "name-id",
    label: "Name + ID Similarity",
    description: "Compare substance names and UNII identifiers (Jaccard)",
  },
];

// similarity workbench. two modes: the ELH ontology tools (default) and a name+ID Jaccard mode
// that runs a SPARQL query then scores the returned substances client-side against a threshold.
export default function SubstanceSimilarity({ isDark }: SubstanceSimilarityProps) {
  const [sparql, setSparql] = useState(DEFAULT_QUERY);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultSimThreshold = useUserPreferences((s) => s.simThreshold);
  const [threshold, setThreshold] = useState<number>(defaultSimThreshold);
  // re-sync when user changes default in Settings (only if user hasn't manually tweaked the slider yet)
  useEffect(() => {
    setThreshold(defaultSimThreshold);
  }, [defaultSimThreshold]);
  const [picked, setPicked] = useState<PairScore | null>(null);
  const [simMode, setSimMode] = useState<SimMode>("substance");

  // run the name+ID mode's SPARQL against the shared endpoint, asking for JSON results
  async function runQuery() {
    if (!sparql.trim() || running) return;
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(routes.sparql, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: sparql,
          accept: "application/sparql-results+json",
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`HTTP ${res.status} ${res.statusText}${text ? ` - ${truncate(text)}` : ""}`);
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
  // slider-filtered view of the scored pairs; recompute cheaply as the threshold moves
  const visible = useMemo(() => pairs.filter((p) => p.score >= threshold), [pairs, threshold]);

  const tc = themeClasses(isDark);
  const muted = tc.muted;
  const heading = tc.heading;
  const subtle = tc.subtle;
  const card = tc.card;
  const codeBg = isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-gray-50 border-gray-200 text-gray-800";
  const inputCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      <SimilarityInfoPanel
        isDark={isDark}
        mode={simMode}
        onModeChange={setSimMode}
      />

      <section className="flex-1 overflow-auto flex flex-col p-6 gap-5">
      <div className="flex items-center gap-3">
        <div>
          <h2 className={`text-xl font-bold ${heading}`} style={{ fontFamily: "Georgia, serif" }}>
            Query Similarity
          </h2>
        </div>
      </div>

      {simMode === "substance" ? (
        <SubstanceElhMode isDark={isDark} />
      ) : (
      <>
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
          rows={10}
          spellCheck={false}
          className={`w-full px-3 py-2 rounded border text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${codeBg}`}
        />
        <button
          onClick={runQuery}
          disabled={running || !sparql.trim()}
          className="self-start flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          <span>{running ? "Running..." : "SEND QUERY"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-2`}>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-sm font-semibold ${subtle}`}>Query Result</label>
            {results && (
              <span className={`text-[10px] ${muted}`}>
                {results.results?.bindings?.length ?? 0} bindings | {concepts.length} unique concepts
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
            <pre className={`text-xs font-mono leading-relaxed overflow-auto p-2 rounded ${codeBg}`} style={{ height: 380 }}>
              {`Output: ${results.head.vars.join(", ")}\n`}
              {concepts.map((c) => `Output: ${c.iri}${c.name ? ` (${c.name})` : ""}\n`).join("")}
            </pre>
          )}
        </div>

        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className={`text-sm font-semibold ${subtle}`}>Explanation Section</label>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                simMode === "name-id"
                  ? isDark ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"
                  : isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-50 text-purple-700"
              }`}>
                {simMode === "name-id" ? "Name + ID" : "Substance"}
              </span>
            </div>
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
      </>
      )}

      {picked && (
        <SimilarityDetailsModal pair={picked} onClose={() => setPicked(null)} isDark={isDark} />
      )}
      </section>
    </div>
  );
}

interface ElhPairResponse {
  conceptA: string;
  conceptB: string;
  score: number;
  methodUsed: string;
  ontology: string;
}

interface ElhTopKResponse {
  concept: string;
  k: number;
  scope: number;
  scopePrefix: string;
  methodUsed: string;
  ontology: string;
  elapsedMs: number;
  results: { concept: string; label: string | null; score: number }[];
}

const SCOPE_LABELS: { value: number; label: string; description: string }[] = [
  { value: 0, label: "All",        description: "All 7,024 concepts (slow first call, ~30s)" },
  { value: 1, label: "L1 anat.",   description: "Same anatomical group (1-char prefix)" },
  { value: 2, label: "L2 ther.",   description: "Same therapeutic main group (3-char)" },
  { value: 3, label: "L3 sub.",    description: "Same therapeutic subgroup (4-char)" },
  { value: 4, label: "L4 chem.",   description: "Same chemical subgroup (5-char) - fastest" },
];

// bucket a 0..1 ELH similarity score into a human-readable ATC relatedness tier + color tone
function tierFromScore(s: number): { label: string; tone: string; description: string } {
  if (s >= 0.80)
    return {
      label: "Tier 1 - Sibling (5th-level)",
      tone: "emerald",
      description: "Same lowest ATC subgroup - clinically near-identical class",
    };
  if (s >= 0.60)
    return {
      label: "Tier 2 - Same therapeutic subgroup",
      tone: "teal",
      description: "Share 3rd / 4th-level - same general mechanism",
    };
  if (s >= 0.40)
    return {
      label: "Tier 3 - Same anatomical class",
      tone: "sky",
      description: "Share 2nd-level - same body system",
    };
  if (s >= 0.20)
    return {
      label: "Tier 4 - Distant relation",
      tone: "amber",
      description: "Different subclasses but share a top-level anatomy",
    };
  return {
    label: "Tier 5 - Cross-system",
    tone: "rose",
    description: "Different anatomical systems entirely",
  };
}

type ElhSubTab = "pair" | "topk" | "expand";

interface ElhExpandResponse {
  originalSparql: string;
  expandedSparql: string;
  expansions: {
    variable: string;
    seedConcept: string;
    k: number;
    scope: number;
    iriPrefix: string | null;
    minScore: number | null;
    neighbours: { concept: string; label: string | null; score: number }[];
  }[];
}

type ElhTreeNode = string | number | boolean | null | ElhTreeNode[] | { [k: string]: ElhTreeNode };

interface ElhExplainResponse {
  conceptA: string;
  conceptB: string;
  similarity: number;
  forward: ElhTreeNode;
  backward: ElhTreeNode;
}

const DEFAULT_EXPAND_SPARQL = `# @expand:?atcCode=M01AE01:k=5:scope=2
PREFIX atc: <http://purl.bioontology.org/ontology/ATC/>

SELECT ?drug ?atcCode WHERE {
  ?drug :hasATC ?atcCode .
}
LIMIT 50`;

// the ELH ontology toolset, three sub-tabs sharing one concept datalist: expand a SPARQL query with
// similar concepts, find a concept's top-k neighbours, or score/explain a single A-vs-B pair.
function SubstanceElhMode({ isDark }: { isDark: boolean }) {
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const card = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const codeBg = isDark ? "bg-slate-950 border-slate-800 text-slate-200" : "bg-gray-50 border-gray-200 text-gray-800";
  const inputCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";

  const [subTab, setSubTab] = useState<ElhSubTab>("expand");
  const [conceptA, setConceptA] = useState("M01AE01");
  const [conceptB, setConceptB] = useState("M01AE02");
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<ElhPairResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conceptList, setConceptList] = useState<string[]>([]);

  const [tkConcept, setTkConcept] = useState("M01AE01");
  const [tkK, setTkK] = useState(10);
  const [tkScope, setTkScope] = useState(2);
  const [tkComputing, setTkComputing] = useState(false);
  const [tkResult, setTkResult] = useState<ElhTopKResponse | null>(null);
  const [tkError, setTkError] = useState<string | null>(null);

  const [exSparql, setExSparql] = useState(DEFAULT_EXPAND_SPARQL);
  const [exComputing, setExComputing] = useState(false);
  const [exResult, setExResult] = useState<ElhExpandResponse | null>(null);
  const [exError, setExError] = useState<string | null>(null);

  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<ElhExplainResponse | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  // load the ATC concept list once for the autocomplete datalist; cancelled guard avoids a
  // set-state after unmount if the fetch is slow
  useEffect(() => {
    let cancelled = false;
    fetch(routes.similarityConcepts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.concepts) setConceptList(d.concepts); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  // send SPARQL carrying an @expand annotation; backend returns the rewritten query + the neighbours it injected
  async function runExpand() {
    if (!exSparql.trim() || exComputing) return;
    setExComputing(true);
    setExError(null);
    setExResult(null);
    try {
      const res = await fetch(routes.similarityExpand, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sparql: exSparql }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setExError(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 250)}` : ""}`);
        return;
      }
      const data: ElhExpandResponse = await res.json();
      setExResult(data);
    } catch (e) {
      setExError(e instanceof Error ? e.message : "Network error");
    } finally {
      setExComputing(false);
    }
  }

  // jump to the pair tab pre-filled with a clicked concept as side A
  function gotoPairCompare(code: string) {
    setConceptA(code);
    setSubTab("pair");
  }

  // rank the k closest concepts to a source within the chosen ATC scope
  async function runTopK() {
    if (!tkConcept.trim() || tkComputing) return;
    setTkComputing(true);
    setTkError(null);
    setTkResult(null);
    try {
      const res = await fetch(routes.similarityTopK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: tkConcept.trim(), k: tkK, scope: tkScope }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setTkError(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 250)}` : ""}`);
        return;
      }
      const data: ElhTopKResponse = await res.json();
      setTkResult(data);
    } catch (e) {
      setTkError(e instanceof Error ? e.message : "Network error");
    } finally {
      setTkComputing(false);
    }
  }

  // fetch the forward/backward derivation trees explaining why a pair scored as it did
  async function runExplain(a: string, b: string) {
    if (!a.trim() || !b.trim() || explaining) return;
    setExplaining(true);
    setExplainError(null);
    setExplanation(null);
    try {
      const url = `/api/similarity/elh/explain?a=${encodeURIComponent(a.trim())}&b=${encodeURIComponent(b.trim())}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setExplainError(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 250)}` : ""}`);
        return;
      }
      const data: ElhExplainResponse = await res.json();
      setExplanation(data);
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : "Network error");
    } finally {
      setExplaining(false);
    }
  }

  // score a single A-vs-B pair; clears any prior explanation since it's now stale
  async function compute() {
    if (!conceptA.trim() || !conceptB.trim() || computing) return;
    setComputing(true);
    setError(null);
    setResult(null);
    setExplanation(null);
    setExplainError(null);
    try {
      const res = await fetch(routes.similarityPair, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptA: conceptA.trim(), conceptB: conceptB.trim() }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 250)}` : ""}`);
        return;
      }
      const data: ElhPairResponse = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setComputing(false);
    }
  }

  const score = result?.score ?? null;
  const tier = score != null ? tierFromScore(score) : null;

  return (
    <>
      <ElhSubTabBar isDark={isDark} subTab={subTab} setSubTab={setSubTab} />
      {subTab === "pair" && (
      <>
      <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
        <label className={`text-sm font-semibold ${subtle}`}>Compare two ATC concepts</label>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className={`text-xs ${muted}`}>Concept A (ATC code)</label>
            <div className="relative">
              <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${muted}`} />
              <input
                list="elh-concept-list"
                value={conceptA}
                onChange={(e) => setConceptA(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") compute(); }}
                placeholder="e.g. M01AE01 (Ibuprofen)"
                spellCheck={false}
                className={`w-full pl-8 pr-3 py-2 rounded border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={`text-xs ${muted}`}>Concept B (ATC code)</label>
            <div className="relative">
              <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${muted}`} />
              <input
                list="elh-concept-list"
                value={conceptB}
                onChange={(e) => setConceptB(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") compute(); }}
                placeholder="e.g. M01AE02 (Naproxen)"
                spellCheck={false}
                className={`w-full pl-8 pr-3 py-2 rounded border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
              />
            </div>
          </div>
          <button
            onClick={compute}
            disabled={computing || !conceptA.trim() || !conceptB.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {computing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{computing ? "Computing..." : "COMPUTE"}</span>
          </button>
          <datalist id="elh-concept-list">
            {conceptList.slice(0, 500).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

      </div>

      <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
        <label className={`text-sm font-semibold ${subtle}`}>Result</label>

        {error && (
          <div className={`text-xs ${isDark ? "text-red-300" : "text-red-600"} font-mono break-words`}>
            {error}
          </div>
        )}

        {!result && !error && (
          <p className={`text-xs italic ${muted}`}>Enter two ATC codes and click COMPUTE</p>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold tabular-nums ${heading}`}>
                {result.score.toFixed(3)}
              </span>
            </div>

            {tier && (
              <div className={`rounded border p-3 ${codeBg}`}>
                <p className={`text-sm font-bold ${heading}`}>{tier.label}</p>
                <p className={`text-xs mt-1 ${muted}`}>{tier.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className={muted}>Concept A</p>
                <p className={`font-mono ${heading}`}>{result.conceptA}</p>
              </div>
              <div>
                <p className={muted}>Concept B</p>
                <p className={`font-mono ${heading}`}>{result.conceptB}</p>
              </div>
              <div>
                <p className={muted}>Method</p>
                <p className={`font-mono ${heading}`}>{result.methodUsed}</p>
              </div>
              <div>
                <p className={muted}>Ontology</p>
                <p className={`text-[11px] ${heading}`}>{result.ontology}</p>
              </div>
            </div>

            <div className={`pt-3 mt-1 border-t ${isDark ? "border-slate-800" : "border-gray-200"} flex items-center gap-3`}>
              <button
                onClick={() => runExplain(result.conceptA, result.conceptB)}
                disabled={explaining}
                className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-bold bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-60"
              >
                {explaining ? <Loader2 size={12} className="animate-spin" /> : <Network size={12} />}
                <span>{explaining ? "Computing..." : "EXPLAIN WHY"}</span>
              </button>
            </div>

            {explainError && (
              <div className={`text-xs ${isDark ? "text-red-300" : "text-red-600"} font-mono break-words`}>
                {explainError}
              </div>
            )}

            {explanation && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className={`rounded border p-3 ${codeBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${heading}`}>Forward</span>
                    <span className={`text-[10px] ${muted}`}>{explanation.conceptA} to {explanation.conceptB}</span>
                  </div>
                  <TreeView node={explanation.forward} isDark={isDark} defaultExpanded={1} />
                </div>
                <div className={`rounded border p-3 ${codeBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold ${heading}`}>Backward</span>
                    <span className={`text-[10px] ${muted}`}>{explanation.conceptB} to {explanation.conceptA}</span>
                  </div>
                  <TreeView node={explanation.backward} isDark={isDark} defaultExpanded={1} />
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      </>
      )}

      {subTab === "expand" && (
      <>
        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
          <label className={`text-sm font-semibold ${subtle}`}>SPARQL with expansion annotation</label>

          <textarea
            value={exSparql}
            onChange={(e) => setExSparql(e.target.value)}
            rows={9}
            spellCheck={false}
            className={`w-full px-3 py-2 rounded border text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 ${codeBg}`}
          />

          <button
            onClick={runExpand}
            disabled={exComputing || !exSparql.trim()}
            className="self-start flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exComputing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{exComputing ? "Expanding..." : "EXPAND"}</span>
          </button>
        </div>

        {exError && (
          <div className={`rounded-2xl border p-4 ${card}`}>
            <div className={`text-xs ${isDark ? "text-red-300" : "text-red-600"} font-mono break-words`}>
              {exError}
            </div>
          </div>
        )}

        {exResult && exResult.expansions.length > 0 && (
            <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
              <label className={`text-sm font-semibold ${subtle}`}>
                Expansions
              </label>
              <div className="flex flex-col gap-3">
                {exResult.expansions.map((exp, i) => (
                  <div
                    key={`${exp.variable}-${i}`}
                    className={`rounded-lg border px-3 py-2 ${isDark ? "bg-slate-900/40 border-slate-800" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={`text-sm font-mono font-bold ${heading}`}>
                        {exp.variable}
                      </span>
                      <span className={`text-[10px] ${muted}`}>
                        seed=<b>{exp.seedConcept}</b> | k={exp.k} | scope={exp.scope}
                        {exp.iriPrefix ? ` | iri=${exp.iriPrefix}` : ""}
                      </span>
                    </div>
                    <ul className="flex flex-col">
                      {exp.neighbours.map((n, j) => (
                        <li key={n.concept} className="flex items-center gap-2 text-xs px-1 py-0.5">
                          <span className={`w-5 text-[10px] font-mono text-right ${muted}`}>
                            {j + 1}
                          </span>
                          <button
                            onClick={() => gotoPairCompare(n.concept)}
                            title={`Compare ${exp.seedConcept} vs ${n.concept}`}
                            className={`w-24 font-mono font-semibold text-left hover:underline ${heading}`}
                          >
                            {n.concept}
                          </button>
                          <span className={`flex-1 truncate ${subtle}`} title={n.label ?? ""}>
                            {n.label ?? <span className={muted}>—</span>}
                          </span>
                          <span className={`w-14 text-right font-mono tabular-nums text-[11px] ${heading}`}>
                            {n.score.toFixed(3)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
        )}
      </>
      )}

      {subTab === "topk" && (
      <>
        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
          <label className={`text-sm font-semibold ${subtle}`}>Find Top-K similar drugs</label>

          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_auto_auto_auto] gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className={`text-xs ${muted}`}>Source concept (ATC code)</label>
              <div className="relative">
                <Search size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${muted}`} />
                <input
                  list="elh-concept-list"
                  value={tkConcept}
                  onChange={(e) => setTkConcept(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runTopK(); }}
                  placeholder="e.g. M01AE01 (Ibuprofen)"
                  spellCheck={false}
                  className={`w-full pl-8 pr-3 py-2 rounded border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-xs ${muted}`}>K</label>
              <input
                type="number"
                min={1}
                max={50}
                value={tkK}
                onChange={(e) => setTkK(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
                className={`w-20 px-3 py-2 rounded border text-sm font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-xs ${muted}`}>Scope</label>
              <select
                value={tkScope}
                onChange={(e) => setTkScope(Number(e.target.value))}
                className={`px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputCls}`}
              >
                {SCOPE_LABELS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={runTopK}
              disabled={tkComputing || !tkConcept.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {tkComputing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              <span>{tkComputing ? "Computing..." : "FIND"}</span>
            </button>
          </div>

        </div>

        <div className={`rounded-2xl border p-4 ${card} flex flex-col gap-3`}>
          <div className="flex items-center justify-between">
            <label className={`text-sm font-semibold ${subtle}`}>Ranked Neighbours</label>
            {tkResult && (
              <span className={`text-[10px] ${muted}`}>
                {tkResult.results.length} of top {tkResult.k} | scope=&quot;{tkResult.scopePrefix}&quot; | {tkResult.elapsedMs} ms
              </span>
            )}
          </div>

          {tkError && (
            <div className={`text-xs ${isDark ? "text-red-300" : "text-red-600"} font-mono break-words`}>
              {tkError}
            </div>
          )}

          {!tkResult && !tkError && (
            <p className={`text-xs italic ${muted}`}>
              Enter an ATC concept and click FIND to discover its closest neighbours in the ELH ontology.
            </p>
          )}

          {tkResult && tkResult.results.length === 0 && (
            <p className={`text-xs italic ${muted}`}>
              No neighbours found in this scope. Try widening to L1 anatomical or All.
            </p>
          )}

          {tkResult && tkResult.results.length > 0 && (
            <div style={{ maxHeight: 460 }} className="overflow-y-auto">
              <ul className="flex flex-col">
                {tkResult.results.map((n, i) => {
                  return (
                    <li
                      key={n.concept}
                      className={`flex items-center gap-2 px-2 py-0.5 rounded ${
                        isDark ? "hover:bg-slate-800/60" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className={`w-5 text-[10px] font-mono text-right ${muted}`}>{i + 1}</span>
                      <button
                        onClick={() => gotoPairCompare(n.concept)}
                        title={`Compare ${tkResult.concept} vs ${n.concept}`}
                        className={`w-24 font-mono text-xs font-semibold text-left hover:underline ${heading}`}
                      >
                        {n.concept}
                      </button>
                      <span className={`flex-1 truncate text-xs ${subtle}`} title={n.label ?? ""}>
                        {n.label ?? <span className={muted}>—</span>}
                      </span>
                      <span className={`w-14 text-right font-mono text-xs tabular-nums ${heading}`}>
                        {n.score.toFixed(3)}
                      </span>
                      <button
                        title={`Compare ${tkResult.concept} vs ${n.concept}`}
                        onClick={() => {
                          setConceptA(tkResult.concept);
                          setConceptB(n.concept);
                          setSubTab("pair");
                        }}
                        className={`text-[10px] underline ${muted}`}
                      >
                        compare
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </>
      )}
    </>
  );
}

// segmented control switching between the three ELH sub-tools
function ElhSubTabBar({
  isDark, subTab, setSubTab,
}: {
  isDark: boolean;
  subTab: ElhSubTab;
  setSubTab: (s: ElhSubTab) => void;
}) {
  const active = "bg-blue-600 text-white border-blue-600";
  const inactive = isDark
    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
    : "border-gray-200 text-gray-700 hover:bg-gray-50";
  const tabs: { value: ElhSubTab; label: string; sub: string }[] = [
    { value: "expand", label: "Expand SPARQL", sub: "augment query with similar concepts" },
    { value: "topk", label: "Find Top-K Similar", sub: "rank neighbours of one concept" },
    { value: "pair", label: "Find Concept Pairs", sub: "score a vs b" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => setSubTab(t.value)}
          className={`flex flex-col items-start gap-0.5 px-4 py-2 rounded border text-xs transition-colors ${
            subTab === t.value ? active : inactive
          }`}
        >
          <span className="font-bold">{t.label}</span>
          <span className={`text-[10px] ${subTab === t.value ? "text-blue-100" : "opacity-70"}`}>
            {t.sub}
          </span>
        </button>
      ))}
    </div>
  );
}

// collapsible JSON viewer for the explain-why derivation trees
function TreeView({
  node,
  isDark,
  defaultExpanded = 0,
}: {
  node: ElhTreeNode;
  isDark: boolean;
  defaultExpanded?: number;
}) {
  return (
    <div className="text-[11px] font-mono leading-relaxed">
      <TreeNode node={node} isDark={isDark} depth={0} defaultExpanded={defaultExpanded} />
    </div>
  );
}

// one node in the tree: null/scalar render inline, arrays/objects get a clickable expander.
// syntax-highlights keys/strings/numbers like a pretty-printed JSON blob.
function TreeNode({
  node,
  isDark,
  depth,
  label,
  defaultExpanded,
}: {
  node: ElhTreeNode;
  isDark: boolean;
  depth: number;
  label?: string;
  defaultExpanded: number;
}) {
  // recursive renderer for one JSON value; rows above defaultExpanded depth start open
  const [open, setOpen] = useState(depth < defaultExpanded);

  const keyClr   = isDark ? "text-sky-300"     : "text-sky-700";
  const strClr   = isDark ? "text-emerald-300" : "text-emerald-700";
  const numClr   = isDark ? "text-amber-300"   : "text-amber-700";
  const punctClr = isDark ? "text-slate-500"   : "text-gray-400";
  const muted    = isDark ? "text-slate-500"   : "text-gray-400";

  if (node === null) {
    return (
      <span>
        {label !== undefined && <><span className={keyClr}>{`"${label}"`}</span><span className={punctClr}>: </span></>}
        <span className={muted}>null</span>
      </span>
    );
  }
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    const isStr = typeof node === "string";
    return (
      <span>
        {label !== undefined && <><span className={keyClr}>{`"${label}"`}</span><span className={punctClr}>: </span></>}
        <span className={isStr ? strClr : numClr}>{isStr ? `"${node}"` : String(node)}</span>
      </span>
    );
  }

  if (Array.isArray(node)) {
    if (node.length === 0) {
      return (
        <span>
          {label !== undefined && <><span className={keyClr}>{`"${label}"`}</span><span className={punctClr}>: </span></>}
          <span className={punctClr}>[]</span>
        </span>
      );
    }
    return (
      <div>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1">
          {open ? <ChevronDown size={11} className={muted} /> : <ChevronRight size={11} className={muted} />}
          {label !== undefined && <><span className={keyClr}>{`"${label}"`}</span><span className={punctClr}>: </span></>}
          <span className={punctClr}>{open ? "[" : `[ ${node.length} items ]`}</span>
        </button>
        {open && (
          <div className="ml-4 border-l border-current/10 pl-3">
            {node.map((child, i) => (
              <div key={i}>
                <TreeNode node={child} isDark={isDark} depth={depth + 1} defaultExpanded={defaultExpanded} />
                {i < node.length - 1 && <span className={punctClr}>,</span>}
              </div>
            ))}
          </div>
        )}
        {open && <span className={punctClr}>]</span>}
      </div>
    );
  }

  const entries = Object.entries(node);
  if (entries.length === 0) {
    return (
      <span>
        {label !== undefined && <><span className={keyClr}>{`"${label}"`}</span><span className={punctClr}>: </span></>}
        <span className={punctClr}>{"{}"}</span>
      </span>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1">
        {open ? <ChevronDown size={11} className={muted} /> : <ChevronRight size={11} className={muted} />}
        {label !== undefined && <><span className={keyClr}>{`"${label}"`}</span><span className={punctClr}>: </span></>}
        <span className={punctClr}>{open ? "{" : `{ ${entries.length} fields }`}</span>
      </button>
      {open && (
        <div className="ml-4 border-l border-current/10 pl-3">
          {entries.map(([k, v], i) => (
            <div key={k}>
              <TreeNode node={v} isDark={isDark} depth={depth + 1} label={k} defaultExpanded={defaultExpanded} />
              {i < entries.length - 1 && <span className={punctClr}>,</span>}
            </div>
          ))}
        </div>
      )}
      {open && <span className={punctClr}>{"}"}</span>}
    </div>
  );
}

// left rail that switches between the two top-level similarity modes
function SimilarityInfoPanel({
  isDark,
  mode,
  onModeChange,
}: {
  isDark: boolean;
  mode: SimMode;
  onModeChange: (m: SimMode) => void;
}) {
  const bg = isDark ? "bg-slate-900" : "bg-white";
  const border = isDark ? "border-slate-800" : "border-gray-200";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const sectionLabel = `text-[11px] uppercase tracking-wider font-semibold ${muted}`;
  const tabActive = "bg-blue-600 text-white border-blue-600";
  const tabInactive = isDark
    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
    : "border-gray-200 text-gray-700 hover:bg-gray-50";

  return (
    <aside className={`w-full md:w-72 md:shrink-0 border-r overflow-y-auto ${bg} ${border}`}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-blue-600" />
          <h2 className={`text-sm font-bold ${heading}`}>Similarity Information</h2>
        </div>

        <div className="flex flex-col gap-2">
          <span className={sectionLabel}>Similarity Mode</span>
          <button
            onClick={() => onModeChange("substance")}
            className={`flex items-start gap-2 px-3 py-2 rounded border text-left text-xs transition-colors ${
              mode === "substance" ? tabActive : tabInactive
            }`}
          >
            <Atom size={14} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Substance Sim (ELH)</span>
              <span className={mode === "substance" ? "text-blue-100" : muted}>
                Semantic similarity via ontology
              </span>
            </div>
          </button>
          <button
            onClick={() => onModeChange("name-id")}
            className={`flex items-start gap-2 px-3 py-2 rounded border text-left text-xs transition-colors ${
              mode === "name-id" ? tabActive : tabInactive
            }`}
          >
            <Tags size={14} className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Query Name Sim</span>
              <span className={mode === "name-id" ? "text-blue-100" : muted}>
                Compare names + UNII (Jaccard)
              </span>
            </div>
          </button>
        </div>
      </div>
    </aside>
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

// build the side-by-side comparison rows for the details modal: name, identifier, and the
// word/trigram overlap breakdowns that explain the Jaccard score. context rows are supporting detail.
function getAttributes(pair: PairScore): AttributeRow[] {
  const a = pair.a;
  const b = pair.b;
  const tokensA = wordTokens(a.name);
  const tokensB = wordTokens(b.name);
  const setB = new Set(tokensB);
  const sharedWords = tokensA.filter((t) => setB.has(t));
  const wordPct = Math.round(jaccard(tokensA, tokensB) * 100);
  const trA = charTrigrams(a.name);
  const trB = charTrigrams(b.name);
  const setTrB = new Set(trB);
  const sharedTrigrams = trA.filter((t) => setTrB.has(t));
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
      valueA: a.identifier ?? "-",
      valueB: b.identifier ?? "-",
      matched: !!a.identifier && !!b.identifier && a.identifier === b.identifier,
      mono: true,
    },
    {
      key: "word-tokens",
      label: "Word tokens",
      valueA: tokensA.length > 0 ? tokensA.join(", ") : "-",
      valueB: tokensB.length > 0 ? tokensB.join(", ") : "-",
      matched: false,
      mono: true,
      context: true,
    },
    {
      key: "word-overlap",
      label: "Word overlap",
      valueA: sharedWords.length > 0 ? sharedWords.join(", ") : "(none)",
      valueB: `${sharedWords.length}/${tokensA.length + tokensB.length - sharedWords.length} = ${wordPct}%`,
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
      valueB: `${sharedTrigrams.length}/${trA.length + trB.length - sharedTrigrams.length} = ${charPct}%`,
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

// full-screen breakdown for a picked pair, two substance columns with every attribute row from
// getAttributes. backdrop click closes; inner stopPropagation keeps panel clicks from closing it.
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
                <p className={`text-sm font-bold break-words leading-snug ${heading}`} title={pair.a.name}>
                  {pair.a.name}
                </p>
                <p className={`text-[10px] font-mono break-all leading-snug ${muted}`} title={pair.a.iri}>
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
                <p className={`text-sm font-bold break-words leading-snug ${heading}`} title={pair.b.name}>
                  {pair.b.name}
                </p>
                <p className={`text-[10px] font-mono break-all leading-snug ${muted}`} title={pair.b.iri}>
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
