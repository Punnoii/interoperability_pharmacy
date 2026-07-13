"use client";

import { X } from "lucide-react";
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

// side panel for the selected node: its IRI/value, degree, and a clickable list of relationships.
// clicking a neighbor re-selects it, so you can walk the graph without touching the canvas.
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

  // walk every link touching this node, tagging each neighbor as incoming or outgoing
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

  // nothing selected, render nothing (kept after the hooks so hook order stays stable)
  if (!node) return null;

  const meta = getTypeMeta(node.type, allTypes);
  const accent = isDark ? meta.colorDark : meta.color;
  const wrap = isDark
    ? "bg-slate-800 border-slate-700 text-slate-100"
    : "bg-white border-gray-200 text-gray-900";
  const muted = isDark ? "text-slate-400" : "text-gray-500";
  const subtleBox = isDark ? "bg-slate-900 border-slate-700" : "bg-gray-50 border-gray-200";

  return (
    <aside
      className={`absolute top-3 right-3 bottom-3 left-3 w-auto md:left-auto md:w-80 rounded border p-4 flex flex-col gap-3 overflow-hidden z-30 ${wrap}`}
    >
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
          <h2 className="text-sm font-bold leading-snug break-words">
            {node.isUri ? shortenIri(node.id) : node.label}
          </h2>
          <p className={`text-[11px] mt-0.5 ${muted}`}>
            {node.isUri ? "URI resource" : "Literal value"}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className={`p-1 rounded ${
            isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"
          }`}
        >
          <X size={14} />
        </button>
      </header>

      <section className={`rounded border p-2.5 ${subtleBox}`}>
        <div className={`text-[10px] uppercase font-semibold mb-1 ${muted}`}>
          {node.isUri ? "IRI" : "Value"}
        </div>
        {node.isUri ? (
          <a
            href={node.id}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono break-all leading-relaxed text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {node.id}
          </a>
        ) : (
          <code className="text-[11px] font-mono break-all leading-relaxed">
            {node.id}
          </code>
        )}
      </section>

      <section className={`rounded border px-3 py-2 ${subtleBox}`}>
        <div className={`text-[10px] uppercase font-semibold ${muted}`}>Connections</div>
        <div className="text-lg font-bold">{node.degree}</div>
      </section>

      <section className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className={`text-[10px] uppercase font-semibold mb-2 px-1 ${muted}`}>
          Relationships
        </div>
        <ul className="overflow-y-auto flex-1 flex flex-col gap-1.5 pr-1">
          {neighbors.length === 0 && (
            <li className={`text-xs px-2 py-3 text-center ${muted}`}>
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
                  className={`w-full text-left rounded border px-3 py-2 ${
                    isDark
                      ? "bg-slate-900 border-slate-700 hover:bg-slate-700"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: nbAccent }}
                    />
                    <span className={`text-[10px] font-mono uppercase ${muted}`}>
                      {nb.direction === "outgoing" ? "→" : "←"} {nb.predicate}
                    </span>
                  </div>
                  <div className="text-xs font-semibold break-words">
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
