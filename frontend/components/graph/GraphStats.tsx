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

  const bg = isDark ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const numberColor = isDark ? "#f1f5f9" : "#0f172a";
  const labelColor = isDark ? "#94a3b8" : "#64748b";
  const hintColor = isDark ? "#64748b" : "#94a3b8";

  return (
    <div
      className="rounded-2xl px-4 py-3 backdrop-blur-md min-w-[180px]"
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
        Graph Statistics
      </div>

      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <div className="text-2xl font-bold leading-none" style={{ color: numberColor }}>
            {nodes.length}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: labelColor }}>
            nodes
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold leading-none" style={{ color: numberColor }}>
            {edgeCount}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: labelColor }}>
            edges
          </div>
        </div>
      </div>

      {allTypes.length > 0 && (
        <div className="flex flex-col gap-1 pt-2" style={{ borderTop: `1px solid ${border}` }}>
          {allTypes.map((t) => {
            const meta = getTypeMeta(t, allTypes);
            return (
              <div key={t} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: isDark ? meta.colorDark : meta.color }}
                  />
                  <span className="font-mono" style={{ color: labelColor }}>
                    ?{meta.label}
                  </span>
                </div>
                <span className="font-semibold tabular-nums" style={{ color: numberColor }}>
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
