"use client";

import { useState } from "react";
import { Database, RotateCcw, Trash2 } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

interface ProfileFile {
  filename: string;
  size: number;
  modifiedAt: number;
}

interface ProfileData {
  exists: boolean;
  fileCount: number;
  files: ProfileFile[];
}

interface Props {
  isDark: boolean;
  data: ProfileData | null;
  onDeleted: () => void;
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export default function SavedConfigSection({ isDark, data, onDeleted }: Props) {
  const [busy, setBusy] = useState<"restore" | "delete" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtle = isDark ? "text-slate-300" : "text-gray-700";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const rowBg = isDark ? "bg-slate-800/50" : "bg-gray-100";
  const okBg = isDark ? "bg-emerald-950/50 text-emerald-300" : "bg-emerald-50 text-emerald-700";
  const errBg = isDark ? "bg-red-950/50 text-red-300" : "bg-red-50 text-red-600";
  const deleteBtn = isDark
    ? "border-red-900/50 text-red-300 hover:bg-red-950/50"
    : "border-red-200 text-red-600 hover:bg-red-50";

  async function restore() {
    setBusy("restore");
    setMsg(null);
    try {
      const res = await fetch(routes.profileConfigRestore, { method: "POST" });
      if (!res.ok) {
        setMsg({ kind: "err", text: `Restore failed: ${(await res.text()).slice(0, 180)}` });
        return;
      }
      const data = await res.json();
      setMsg({ kind: "ok", text: `Restored ${data.fileCount} file(s). Open Upload tab to query.` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Delete your saved config? This cannot be undone.")) return;
    setBusy("delete");
    setMsg(null);
    try {
      const res = await fetch(routes.profileConfig, { method: "DELETE" });
      if (!res.ok) {
        setMsg({ kind: "err", text: `Delete failed (HTTP ${res.status})` });
        return;
      }
      onDeleted();
      setMsg({ kind: "ok", text: "Saved config deleted." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBusy(null);
    }
  }

  const header = (
    <div className="flex items-center justify-between mb-4">
      <h3 className={`text-base font-semibold ${heading}`}>Saved Config</h3>
      <span className={`text-sm tabular-nums ${muted}`}>{data?.fileCount ?? 0}</span>
    </div>
  );

  if (!data?.exists) {
    return (
      <>
        {header}
        <p className={`text-sm italic ${muted} py-12 text-center`}>
          No saved config. Upload files in the Upload tab and click <span className="font-mono">Save as My Profile</span>.
        </p>
      </>
    );
  }

  return (
    <>
      {header}

      <ul className="flex flex-col gap-2 mb-4">
        {data.files.map((f) => (
          <li key={f.filename} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${rowBg}`}>
            <Database size={14} className={muted} />
            <span className={`flex-1 text-sm font-mono truncate ${subtle}`} title={f.filename}>
              {f.filename}
            </span>
            <span className={`text-xs font-mono ${muted}`}>{fmtSize(f.size)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <button
          onClick={restore}
          disabled={busy !== null}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          <RotateCcw size={12} />
          <span>{busy === "restore" ? "Restoring..." : "Restore to Sandbox"}</span>
        </button>
        <button
          onClick={remove}
          disabled={busy !== null}
          className={`flex items-center gap-2 px-3 py-2 rounded border text-xs disabled:opacity-50 ${deleteBtn}`}
        >
          <Trash2 size={12} />
          <span>{busy === "delete" ? "Deleting..." : "Delete"}</span>
        </button>
      </div>

      {msg && (
        <div className={`text-xs mt-3 px-3 py-2 rounded ${msg.kind === "ok" ? okBg : errBg}`}>
          {msg.text}
        </div>
      )}
    </>
  );
}
