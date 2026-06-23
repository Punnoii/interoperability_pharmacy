"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "./Modal";

interface Props {
  isDark: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ChangePasswordModal({ isDark, onClose, onSaved }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldCls = isDark
    ? "bg-slate-950 border-slate-700 text-slate-100"
    : "bg-white border-gray-300 text-gray-900";
  const labelCls = isDark ? "text-slate-400" : "text-gray-600";

  async function save() {
    setError(null);
    if (!current || !next) {
      setError("Both current and new password are required");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      setError("Confirmation does not match new password");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? res.statusText);
        return;
      }
      alert("Password changed successfully");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, value: string, set: (s: string) => void, isLast = false) => (
    <>
      <label className={`text-xs font-medium ${labelCls}`}>{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => isLast && e.key === "Enter" && !saving && save()}
        className={`mt-1 w-full px-3 py-2 rounded-lg border text-sm ${isLast ? "" : "mb-3"} focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${fieldCls}`}
      />
    </>
  );

  return (
    <Modal isDark={isDark} title="Change Password" onClose={onClose}>
      {field("Current Password", current, setCurrent)}
      {field("New Password (min 8 chars)", next, setNext)}
      {field("Confirm New Password", confirm, setConfirm, true)}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <ModalFooter
        isDark={isDark}
        onCancel={onClose}
        onConfirm={save}
        saving={saving}
        confirmLabel="Update Password"
      />
    </Modal>
  );
}
