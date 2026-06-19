"use client";

import { useRef, useState } from "react";
import { Upload, X, Play, Database } from "lucide-react";

interface UploadPanelProps {
  isDark: boolean;
}

type SlotKey = "ontology" | "database" | "mapping" | "properties" | "catalog";

const SLOTS: { key: SlotKey; label: string; hint: string; accept: string }[] = [
  { key: "ontology",   label: "Ontology",      hint: ".owl, .ttl, .rdf",    accept: ".owl,.ttl,.rdf,.xml" },
  { key: "database",   label: "Database",      hint: ".csv, .sql, .json",   accept: ".csv,.sql,.json,.tsv" },
  { key: "mapping",    label: "Mapping File",  hint: ".obda, .ttl",         accept: ".obda,.ttl,.r2rml" },
  { key: "properties", label: "Property File", hint: ".properties",         accept: ".properties" },
  { key: "catalog",    label: "Catalog File",  hint: ".xml",                accept: ".xml" },
];

type SlotState = Record<SlotKey, File | null>;
const EMPTY: SlotState = {
  ontology: null, database: null, mapping: null, properties: null, catalog: null,
};

const SAMPLE_SPARQL = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?s ?p ?o
WHERE { ?s ?p ?o }
LIMIT 10`;

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface UploadResult {
  stagingId: string;
  stagingDir: string;
  message: string;
  fileCount: number;
}

interface SparqlBinding {
  type: string;
  value: string;
  datatype?: string;
  "xml:lang"?: string;
}

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: Record<string, SparqlBinding>[] };
}

export default function UploadPanel({ isDark }: UploadPanelProps) {
  const [files, setFiles] = useState<SlotState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ kind: "info" | "ok" | "err"; msg: string } | null>(null);
  const [uploaded, setUploaded] = useState<UploadResult | null>(null);

  const [sparql, setSparql] = useState<string>(SAMPLE_SPARQL);
  const [running, setRunning] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const inputs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    ontology: null, database: null, mapping: null, properties: null, catalog: null,
  });

  const text     = isDark ? "text-slate-100" : "text-gray-900";
  const subtle   = isDark ? "text-slate-300" : "text-gray-700";
  const muted    = isDark ? "text-slate-400" : "text-gray-500";
  const card     = isDark ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200";
  const rowDiv   = isDark ? "border-slate-800" : "border-gray-200";
  const btnBase  = isDark
    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50";
  const inputBg  = isDark ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200";
  const codeBg   = isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-gray-50 border-gray-200 text-gray-900";
  const tableHd  = isDark ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-gray-100 text-gray-800 border-gray-300";
  const tableRow = isDark ? "border-slate-800 hover:bg-slate-900" : "border-gray-200 hover:bg-gray-50";

  function pick(key: SlotKey) { inputs.current[key]?.click(); }

  function onChange(key: SlotKey, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFiles((p) => ({ ...p, [key]: f }));
    setStatus(null);
    e.target.value = "";
  }

  function remove(key: SlotKey) {
    setFiles((p) => ({ ...p, [key]: null }));
    setStatus(null);
  }

  function clearAll() {
    setFiles(EMPTY);
    setStatus(null);
    setUploaded(null);
    setResults(null);
    setQueryError(null);
    setElapsedMs(null);
  }

  const selected = Object.values(files).filter((f) => f !== null).length;

  async function upload() {
    if (selected === 0 || uploading) {
      setStatus({ kind: "err", msg: "Please choose at least one file." });
      return;
    }
    setUploading(true);
    setStatus({ kind: "info", msg: "Uploading..." });
    try {
      const form = new FormData();
      for (const s of SLOTS) {
        const f = files[s.key];
        if (f) form.append(s.key, f, f.name);
      }
      const res = await fetch("/api/upload/ontop-config", { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatus({ kind: "err", msg: `Upload failed (HTTP ${res.status}). ${t.slice(0, 180)}` });
        return;
      }
      const data = await res.json().catch(() => ({}));
      const stagingId: string | undefined = data?.stagingId;
      if (!stagingId) {
        setStatus({ kind: "err", msg: "Server response missing stagingId." });
        return;
      }
      setUploaded({
        stagingId,
        stagingDir: data?.stagingDir ?? "",
        message: data?.message ?? `Uploaded ${selected} file(s) successfully.`,
        fileCount: selected,
      });
      setStatus({ kind: "ok", msg: data?.message ?? `Uploaded ${selected} file(s) successfully.` });
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Network error" });
    } finally {
      setUploading(false);
    }
  }

  async function runQuery() {
    if (!uploaded || running) return;
    setRunning(true);
    setQueryError(null);
    setResults(null);
    setElapsedMs(null);
    const t0 = performance.now();
    try {
      const res = await fetch(
        `/api/upload/ontop-config/${uploaded.stagingId}/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sparql,
            accept: "application/sparql-results+json",
          }),
        }
      );
      const elapsed = Math.round(performance.now() - t0);
      setElapsedMs(elapsed);
      const txt = await res.text();
      if (!res.ok) {
        setQueryError(`HTTP ${res.status} - ${txt.slice(0, 300)}`);
        return;
      }
      try {
        const json = JSON.parse(txt);
        if (json?.results?.bindings) {
          setResults(json as SparqlResults);
        } else {
          setQueryError("Unexpected response shape (no results.bindings).");
        }
      } catch {
        setQueryError("Failed to parse JSON response.");
      }
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  const vars = results?.head?.vars ?? [];
  const rows = results?.results?.bindings ?? [];

  return (
    <section className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className={`text-xl font-bold ${text}`}>Upload Configuration</h2>
          <p className={`text-sm mt-1 ${muted}`}>
            Provide the files for the Ontop / Trino setup. Fields can be filled in any order;
            only the slots that contain a file are sent to the server.
          </p>
        </div>

        <div className={`rounded-lg border ${card}`}>
          {SLOTS.map((slot, i) => {
            const f = files[slot.key];
            return (
              <div
                key={slot.key}
                className={`flex items-center gap-4 px-4 py-3 ${i !== SLOTS.length - 1 ? `border-b ${rowDiv}` : ""}`}
              >
                <span className={`w-6 text-sm font-mono ${muted}`}>{i + 1}.</span>

                <div className="w-44">
                  <div className={`text-sm font-semibold ${text}`}>{slot.label}</div>
                  <div className={`text-[11px] font-mono ${muted}`}>{slot.hint}</div>
                </div>

                <button
                  onClick={() => pick(slot.key)}
                  className={`text-xs px-3 py-1.5 rounded border ${btnBase}`}
                >
                  Choose File
                </button>

                <div className="flex-1 min-w-0">
                  {f ? (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${subtle}`} title={f.name}>{f.name}</span>
                      <span className={`text-[11px] ${muted}`}>({fmtSize(f.size)})</span>
                    </div>
                  ) : (
                    <span className={`text-xs italic ${muted}`}>no file chosen</span>
                  )}
                </div>

                {f && (
                  <button
                    onClick={() => remove(slot.key)}
                    aria-label="Remove file"
                    className={`p-1 rounded ${
                      isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <X size={14} />
                  </button>
                )}

                <input
                  ref={(el) => { inputs.current[slot.key] = el; }}
                  type="file"
                  accept={slot.accept}
                  onChange={(e) => onChange(slot.key, e)}
                  className="hidden"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={upload}
            disabled={uploading || selected === 0}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload size={14} />
            <span>{uploading ? "Uploading..." : "Upload Files"}</span>
          </button>
          <button
            onClick={clearAll}
            disabled={uploading || (selected === 0 && !uploaded)}
            className={`text-xs px-3 py-2 rounded border ${btnBase} disabled:opacity-50`}
          >
            Clear
          </button>
          <span className={`text-xs ${muted}`}>
            {selected} of {SLOTS.length} files chosen
          </span>
        </div>

        {status && (
          <div
            className={`text-sm px-3 py-2 rounded border ${inputBg} ${
              status.kind === "ok"
                ? isDark ? "text-emerald-300 border-emerald-900/50" : "text-emerald-700 border-emerald-200"
                : status.kind === "err"
                ? isDark ? "text-red-300 border-red-900/50" : "text-red-600 border-red-200"
                : muted
            }`}
          >
            {status.msg}
          </div>
        )}

        {uploaded && (
          <div className={`rounded-lg border ${card} flex flex-col gap-4 p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database size={16} className={subtle} />
                <h3 className={`text-base font-semibold ${text}`}>
                  Query against uploaded config
                </h3>
              </div>
              <div className={`text-[11px] font-mono ${muted}`}>
                staging id: {uploaded.stagingId} - {uploaded.fileCount} files
              </div>
            </div>

            <p className={`text-xs ${muted}`}>
              Run a SPARQL query against the deployed Ontop endpoint. The staged config above is
              recorded; the active mapping is the one currently loaded by Ontop.
            </p>

            <textarea
              value={sparql}
              onChange={(e) => setSparql(e.target.value)}
              spellCheck={false}
              rows={9}
              className={`w-full text-[13px] font-mono rounded border px-3 py-2 ${codeBg}`}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={runQuery}
                disabled={running || sparql.trim().length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Play size={13} />
                <span>{running ? "Running..." : "Run Query"}</span>
              </button>
              <button
                onClick={() => setSparql(SAMPLE_SPARQL)}
                disabled={running}
                className={`text-xs px-3 py-2 rounded border ${btnBase} disabled:opacity-50`}
              >
                Sample query
              </button>
              {elapsedMs !== null && (
                <span className={`text-xs font-mono ${muted}`}>
                  {elapsedMs} ms
                </span>
              )}
              {results && (
                <span className={`text-xs ${muted}`}>
                  {rows.length} row{rows.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {queryError && (
              <div
                className={`text-xs px-3 py-2 rounded border font-mono whitespace-pre-wrap ${
                  isDark
                    ? "text-red-300 border-red-900/50 bg-slate-950"
                    : "text-red-700 border-red-200 bg-red-50"
                }`}
              >
                {queryError}
              </div>
            )}

            {results && (
              <div className={`rounded border overflow-auto max-h-96 ${rowDiv}`}>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {vars.map((v) => (
                        <th
                          key={v}
                          className={`text-left font-semibold px-3 py-2 border-b ${tableHd}`}
                        >
                          ?{v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={Math.max(vars.length, 1)}
                          className={`text-center italic px-3 py-4 ${muted}`}
                        >
                          (no results)
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={i} className={`border-b ${tableRow}`}>
                          {vars.map((v) => {
                            const b = row[v];
                            return (
                              <td
                                key={v}
                                className={`px-3 py-2 font-mono align-top ${subtle}`}
                                title={b?.value ?? ""}
                              >
                                {b ? b.value : <span className={muted}>-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
