"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "./Modal";
import { APP_CONFIG } from "@/lib/config";

const { routes } = APP_CONFIG.api;

interface Props {
  isDark: boolean;
  currentName: string;
  onClose: () => void;
  onSaved: (next: string) => void;
}

// rename dialog. no-ops (just closes) if the name is unchanged; otherwise PATCHes the new username
export default function EditNameModal({ isDark, currentName, onClose, onSaved }: Props) {
  const [value, setValue] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";
  const labelCls = isDark ? "text-slate-400" : "text-gray-600";

  async function save() {
    const next = value.trim();
    if (!next) {
      setError("Name cannot be empty");
      return;
    }
    // unchanged, skip the round-trip
    if (next === currentName) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(routes.me, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? res.statusText);
        return;
      }
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isDark={isDark} title="Edit Name" onClose={onClose}>
      <label className={`text-xs font-medium ${labelCls}`}>Display Name</label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !saving && save()}
        maxLength={64}
        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${fieldCls}`}
      />
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <ModalFooter
        isDark={isDark}
        onCancel={onClose}
        onConfirm={save}
        saving={saving}
        confirmLabel="Save"
      />
    </Modal>
  );
}
