"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Upload, X, Database, Save, Trash2 } from "lucide-react";
import QueryPanel from "@/components/query/QueryPanel";
import { SANDBOX_DEFAULT_QUERY, SANDBOX_TEMPLATES } from "@/lib/sandboxTemplates";
import { themeClasses } from "@/lib/themeClasses";
import { truncate, fmtSize } from "@/lib/format";

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

interface SandboxState {
  fileCount: number;
  triples: number;
}

export default function UploadPanel({ isDark }: UploadPanelProps) {
  const [files, setFiles] = useState<SlotState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "info" | "ok" | "err"; msg: string } | null>(null);
  const [sandbox, setSandbox] = useState<SandboxState | null>(null);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  const inputs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    ontology: null, database: null, mapping: null, properties: null, catalog: null,
  });

  const tc = themeClasses(isDark);
  const text     = tc.text;
  const subtle   = tc.subtle;
  const muted    = tc.muted;
  const card     = tc.card;
  const rowDiv   = tc.rowDiv;
  const btnBase  = tc.btnBase;
  const inputBg  = tc.inputBg;

  useEffect(() => {
    fetch("/api/sandbox/status").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      if (!data?.empty) {
        setSandbox({ fileCount: data.fileCount ?? 0, triples: data.triples ?? 0 });
      }
    }).catch(() => {});

    fetch("/api/profile/config").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      setHasSavedProfile(Boolean(data?.exists));
    }).catch(() => {});
  }, []);

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

  async function clearAll() {
    setFiles(EMPTY);
    setStatus(null);
    try {
      await fetch("/api/sandbox/status", { method: "DELETE" });
    } catch {}
    setSandbox(null);
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
      const res = await fetch("/api/sandbox/upload", { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        setStatus({ kind: "err", msg: `Upload failed (HTTP ${res.status}). ${truncate(t)}` });
        return;
      }
      const data = await res.json();
      setSandbox({ fileCount: data.fileCount ?? selected, triples: data.triples ?? 0 });
      setStatus({
        kind: "ok",
        msg: `Loaded ${data.fileCount ?? selected} file(s) into sandbox. ${data.triples ?? 0} triples ready for query.`,
      });
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Network error" });
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    if (!sandbox || saving) return;
    setSaving(true);
    setStatus({ kind: "info", msg: "Saving to your profile..." });
    try {
      const res = await fetch("/api/sandbox/save", { method: "POST" });
      if (!res.ok) {
        const t = await res.text();
        setStatus({ kind: "err", msg: `Save failed: ${truncate(t)}` });
        return;
      }
      setHasSavedProfile(true);
      setStatus({ kind: "ok", msg: "Saved to your profile. View it in the Profile tab." });
    } catch (e) {
      setStatus({ kind: "err", msg: e instanceof Error ? e.message : "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className={`text-xl font-bold ${text}`}>Upload Configuration</h2>
          <p className={`text-sm mt-1 ${muted}`}>
            Files are loaded into a temporary in-memory sandbox tied to your browser session.
            They disappear after 30 minutes idle, unless you save them as your profile.
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

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={upload}
            disabled={uploading || selected === 0}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload size={14} />
            <span>{uploading ? "Uploading..." : "Upload to Sandbox"}</span>
          </button>

          {sandbox && (
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              <span>{saving ? "Saving..." : hasSavedProfile ? "Update Profile" : "Save as My Profile"}</span>
            </button>
          )}

          <button
            onClick={clearAll}
            disabled={uploading || (selected === 0 && !sandbox)}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded border ${btnBase} disabled:opacity-50`}
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>

          <span className={`text-xs ${muted}`}>
            {selected} of {SLOTS.length} files chosen
          </span>
        </div>

        {status && (
          <div
            className={clsx(
              "text-sm px-3 py-2 rounded border",
              inputBg,
              status.kind === "ok" && tc.ok,
              status.kind === "err" && tc.err,
              status.kind === "info" && muted,
            )}
          >
            {status.msg}
          </div>
        )}

        {sandbox && (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${card}`}>
              <div className="flex items-center gap-2">
                <Database size={16} className={subtle} />
                <h3 className={`text-base font-semibold ${text}`}>Sandbox query</h3>
              </div>
              <div className={`text-[11px] font-mono ${muted}`}>
                {sandbox.fileCount} files | {sandbox.triples.toLocaleString()} triples in memory
              </div>
            </div>

            <div className={`rounded-lg border overflow-hidden ${card}`}>
              <QueryPanel
                isDark={isDark}
                sparqlEndpoint="/api/sandbox/query"
                requestShape="sandbox"
                initialQuery={SANDBOX_DEFAULT_QUERY}
                templatesOverride={SANDBOX_TEMPLATES}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
