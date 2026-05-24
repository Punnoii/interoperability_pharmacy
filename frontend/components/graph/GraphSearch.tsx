"use client";

import { Search, X } from "lucide-react";

interface GraphSearchProps {
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
}

export default function GraphSearch({ value, onChange, isDark }: GraphSearchProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded border px-2 py-1.5 w-64 ${
        isDark
          ? "bg-slate-800 border-slate-700 text-slate-100"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      <Search size={14} className={isDark ? "text-slate-500" : "text-gray-400"} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search nodes..."
        className="flex-1 bg-transparent outline-none text-xs"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className={isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-700"}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
