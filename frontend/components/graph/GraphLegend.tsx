"use client";

import { getTypeMeta } from "./graphUtils";

interface GraphLegendProps {
  allTypes: string[];
  isDark: boolean;
}

export default function GraphLegend({ allTypes, isDark }: GraphLegendProps) {
  const bg = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const labelColor = isDark ? "#e2e8f0" : "#1e293b";
  const hintColor = isDark ? "#64748b" : "#94a3b8";

  if (allTypes.length === 0) return null;

  return (
    <div
      className="rounded-2xl px-4 py-3 backdrop-blur-md"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.08)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: hintColor }}
      >
        Variables
      </div>
      <ul className="flex flex-col gap-1.5">
        {allTypes.map((t) => {
          const meta = getTypeMeta(t, allTypes);
          return (
            <li key={t} className="flex items-center gap-2.5 text-xs">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{
                  background: isDark ? meta.colorDark : meta.color,
                  border: `2px solid ${isDark ? "#0f172a" : "#ffffff"}`,
                  boxShadow: `0 0 0 1px ${isDark ? meta.colorDark : meta.color}`,
                }}
              />
              <span className="font-mono" style={{ color: labelColor }}>
                ?{meta.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
