"use client";

import { Search, X } from "lucide-react";

interface GraphSearchProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
}

export default function GraphSearch({ value, onChange, isDark }: GraphSearchProps) {
  const bg = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputColor = isDark ? "#e2e8f0" : "#0f172a";
  const hintColor = isDark ? "#64748b" : "#94a3b8";

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 backdrop-blur-md w-72"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? "0 4px 12px rgba(0,0,0,0.4)"
          : "0 4px 12px rgba(0,0,0,0.06)",
      }}
    >
      <Search size={16} style={{ color: hintColor }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search nodes…"
        className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-60"
        style={{ color: inputColor }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="p-0.5 rounded hover:bg-black/10 transition-colors"
          style={{ color: hintColor }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
