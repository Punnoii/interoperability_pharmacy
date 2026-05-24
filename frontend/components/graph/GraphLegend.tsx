"use client";

import { getTypeMeta } from "./graphUtils";

interface GraphLegendProps {
  allTypes: string[];
  isDark: boolean;
}

export default function GraphLegend({ allTypes, isDark }: GraphLegendProps) {
  if (allTypes.length === 0) return null;

  return (
    <div
      className={`rounded-md px-3 py-2 border text-xs shadow ${
        isDark
          ? "bg-slate-800 border-slate-700 text-slate-300"
          : "bg-white border-gray-200 text-gray-700"
      }`}
    >
      <div className={`text-[10px] uppercase font-semibold mb-1.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        Variables
      </div>
      <ul className="flex flex-col gap-1">
        {allTypes.map((t) => {
          const meta = getTypeMeta(t, allTypes);
          return (
            <li key={t} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ background: isDark ? meta.colorDark : meta.color }}
              />
              <span className="font-mono">?{meta.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
