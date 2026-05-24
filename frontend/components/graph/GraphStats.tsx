"use client";

import { useMemo } from "react";
import { getTypeMeta, type GraphNode } from "./graphUtils";

interface GraphStatsProps {
  nodes: GraphNode[];
  edgeCount: number;
  allTypes: string[];
  isDark: boolean;
}

export default function GraphStats({ nodes, edgeCount, allTypes, isDark }: GraphStatsProps) {
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const n of nodes) c.set(n.type, (c.get(n.type) ?? 0) + 1);
    return c;
  }, [nodes]);

  const wrapper = isDark
    ? "bg-slate-800 border-slate-700 text-slate-300"
    : "bg-white border-gray-200 text-gray-700";
  const muted = isDark ? "text-slate-500" : "text-gray-500";
  const number = isDark ? "text-slate-100" : "text-gray-900";

  return (
    <div className={`rounded px-3 py-2 border text-xs min-w-[160px] ${wrapper}`}>
      <div className={`text-[10px] uppercase font-semibold mb-1.5 ${muted}`}>
        Statistics
      </div>

      <div className="flex items-baseline gap-4 mb-2">
        <div>
          <div className={`text-lg font-bold ${number}`}>{nodes.length}</div>
          <div className={`text-[10px] ${muted}`}>nodes</div>
        </div>
        <div>
          <div className={`text-lg font-bold ${number}`}>{edgeCount}</div>
          <div className={`text-[10px] ${muted}`}>edges</div>
        </div>
      </div>

      {allTypes.length > 0 && (
        <div className={`flex flex-col gap-0.5 pt-1.5 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          {allTypes.map((t) => {
            const meta = getTypeMeta(t, allTypes);
            return (
              <div key={t} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: isDark ? meta.colorDark : meta.color }}
                  />
                  <span className={`font-mono ${muted}`}>?{meta.label}</span>
                </div>
                <span className={`font-semibold tabular-nums ${number}`}>
                  {counts.get(t) ?? 0}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
