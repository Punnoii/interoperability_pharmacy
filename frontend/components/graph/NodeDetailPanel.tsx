"use client";

import { ExternalLink, X } from "lucide-react";
import { useMemo } from "react";
import { getTypeMeta, shortenIri, type GraphLink, type GraphNode } from "./graphUtils";

interface NodeDetailPanelProps {
  node: GraphNode | null;
  links: GraphLink[];
  nodes: GraphNode[];
  allTypes: string[];
  isDark: boolean;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
}

interface Neighbor {
  node: GraphNode;
  predicate: string;
  direction: "outgoing" | "incoming";
}

export default function NodeDetailPanel({
  node,
  links,
  nodes,
  allTypes,
  isDark,
  onClose,
  onSelectNode,
}: NodeDetailPanelProps) {
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const neighbors = useMemo<Neighbor[]>(() => {
    if (!node) return [];
    const list: Neighbor[] = [];
    for (const l of links) {
      const sId = typeof l.source === "string" ? l.source : l.source.id;
      const tId = typeof l.target === "string" ? l.target : l.target.id;
      if (sId === node.id) {
        const target = nodeById.get(tId);
        if (target) list.push({ node: target, predicate: l.label, direction: "outgoing" });
      } else if (tId === node.id) {
        const source = nodeById.get(sId);
        if (source) list.push({ node: source, predicate: l.label, direction: "incoming" });
      }
    }
    return list;
  }, [node, links, nodeById]);

  if (!node) return null;

  const meta = getTypeMeta(node.type, allTypes);
  const accent = isDark ? meta.colorDark : meta.color;
  const bg = isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const titleColor = isDark ? "#f1f5f9" : "#0f172a";
  const labelColor = isDark ? "#94a3b8" : "#64748b";
  const subtleBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)";
  const hintColor = isDark ? "#64748b" : "#94a3b8";
  const linkColor = isDark ? "#60a5fa" : "#2563eb";

  return (
    <aside
      className="absolute top-3 right-3 bottom-3 w-80 rounded-2xl p-4 backdrop-blur-md flex flex-col gap-3 overflow-hidden z-30"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.6)" : "0 16px 48px rgba(0,0,0,0.12)",
      }}
    >
      {/* Header */}
      <header className="flex items-start gap-2">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold shrink-0"
          style={{
            background: `${accent}22`,
            color: accent,
            border: `1px solid ${accent}55`,
          }}
        >
          ?{meta.label}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold leading-snug break-words" style={{ color: titleColor }}>
            {node.isUri ? shortenIri(node.id) : node.label}
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: hintColor }}>
            {node.isUri ? "URI resource" : "Literal value"}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className="p-1 rounded-lg transition-colors"
          style={{ color: labelColor }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = subtleBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <X size={14} />
        </button>
      </header>

      {/* Identity */}
      <section className="rounded-xl p-2.5" style={{ background: subtleBg }}>
        <div
          className="text-[10px] uppercase tracking-wider font-semibold mb-1"
          style={{ color: hintColor }}
        >
          {node.isUri ? "IRI" : "Value"}
        </div>
        <div className="flex items-start gap-2">
          <code
            className="text-[11px] font-mono break-all leading-relaxed flex-1"
            style={{ color: titleColor }}
          >
            {node.id}
          </code>
          {node.isUri && (
            <a
              href={node.id}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1 rounded transition-colors"
              style={{ color: linkColor }}
              title="Open IRI in new tab"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </section>

      {/* Degree */}
      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-xl px-3 py-2" style={{ background: subtleBg }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: hintColor }}>
            Connections
          </div>
          <div className="text-xl font-bold" style={{ color: titleColor }}>
            {node.degree}
          </div>
        </div>
        <div className="rounded-xl px-3 py-2" style={{ background: subtleBg }}>
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: hintColor }}>
            Neighbors
          </div>
          <div className="text-xl font-bold" style={{ color: titleColor }}>
            {neighbors.length}
          </div>
        </div>
      </section>

      {/* Neighbors */}
      <section className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div
          className="text-[10px] uppercase tracking-wider font-semibold mb-2 px-1"
          style={{ color: hintColor }}
        >
          Relationships
        </div>
        <ul className="overflow-y-auto flex-1 flex flex-col gap-1.5 pr-1">
          {neighbors.length === 0 && (
            <li className="text-xs px-2 py-3 text-center" style={{ color: hintColor }}>
              No relationships
            </li>
          )}
          {neighbors.map((nb, idx) => {
            const nbMeta = getTypeMeta(nb.node.type, allTypes);
            const nbAccent = isDark ? nbMeta.colorDark : nbMeta.color;
            return (
              <li key={`${nb.node.id}-${idx}`}>
                <button
                  onClick={() => onSelectNode(nb.node)}
                  className="w-full text-left rounded-lg px-3 py-2 transition-all"
                  style={{ background: subtleBg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = subtleBg;
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: nbAccent }}
                    />
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider"
                      style={{ color: hintColor }}
                    >
                      {nb.direction === "outgoing" ? "→" : "←"} {nb.predicate}
                    </span>
                  </div>
                  <div
                    className="text-xs font-semibold break-words"
                    style={{ color: titleColor }}
                  >
                    {nb.node.isUri ? shortenIri(nb.node.id) : nb.node.label}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
