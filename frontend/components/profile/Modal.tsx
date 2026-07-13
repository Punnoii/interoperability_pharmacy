"use client";

import { Loader2, X } from "lucide-react";

interface ModalProps {
  isDark: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

// generic centered modal shell. backdrop click closes; the inner stopPropagation keeps clicks
// inside the panel from bubbling out and triggering that close
export function Modal({ isDark, title, onClose, children }: ModalProps) {
  const panel = isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200";
  const border = isDark ? "border-slate-700" : "border-gray-200";
  const heading = isDark ? "text-slate-100" : "text-gray-900";
  const closeBtn = isDark ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100";

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${panel}`}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <h3 className={`text-base font-semibold ${heading}`}>{title}</h3>
          <button onClick={onClose} aria-label="Close" className={`p-1 rounded ${closeBtn}`}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface FooterProps {
  isDark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
  confirmLabel: string;
}

// shared cancel/confirm footer; both buttons disable while saving and the confirm shows a spinner
export function ModalFooter({ isDark, onCancel, onConfirm, saving, confirmLabel }: FooterProps) {
  const cancelBtn = isDark
    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
    : "border-gray-300 text-gray-700 hover:bg-gray-100";

  return (
    <div className="flex justify-end gap-2 mt-5">
      <button
        onClick={onCancel}
        disabled={saving}
        className={`px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-60 ${cancelBtn}`}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        <span>{saving ? "Saving..." : confirmLabel}</span>
      </button>
    </div>
  );
}
