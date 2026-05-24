"use client";

import { useMemo, useRef, useState } from "react";
import GraphCanvas, { type GraphCanvasHandle } from "./GraphCanvas";
import GraphControls from "./GraphControls";
import GraphLegend from "./GraphLegend";
import GraphSearch from "./GraphSearch";
import GraphStats from "./GraphStats";
import NodeDetailPanel from "./NodeDetailPanel";
import {
  bindingsToGenericGraph,
  type GraphNode,
  type SparqlBinding,
} from "./graphUtils";

interface ResultsGraphProps {
  vars: string[];
  bindings: SparqlBinding[];
  isDark: boolean;
}

/**
 * Self-contained graph viewer that turns SPARQL bindings into an interactive
 * knowledge graph. Wraps the canvas, legend, stats, search, controls, and
 * detail panel into one drop-in component.
 */
export default function ResultsGraph({ vars, bindings, isDark }: ResultsGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const canvasRef = useRef<GraphCanvasHandle>(null);

  const { nodes, links, types } = useMemo(
    () => bindingsToGenericGraph(vars, bindings),
    [vars, bindings]
  );

  const hintBg = isDark ? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.85)";
  const hintBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const hintColor = isDark ? "#94a3b8" : "#64748b";

  if (nodes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-2"
        style={{ color: hintColor }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <p className="text-sm font-medium">No graph data</p>
        <p className="text-xs text-center max-w-sm">
          {vars.length < 2
            ? "Need at least 2 selected variables to build a graph."
            : "Query returned 0 rows."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas (full bleed) */}
      <GraphCanvas
        ref={canvasRef}
        nodes={nodes}
        links={links}
        allTypes={types}
        isDark={isDark}
        selectedNodeId={selectedNode?.id ?? null}
        searchTerm={searchTerm}
        onSelectNode={setSelectedNode}
      />

      {/* Top-left: search */}
      <div className="absolute top-3 left-3 z-10">
        <GraphSearch value={searchTerm} onChange={setSearchTerm} isDark={isDark} />
      </div>

      {/* Top-right: zoom controls */}
      <div className="absolute top-3 right-3 z-10">
        {!selectedNode && (
          <GraphControls
            isDark={isDark}
            onResetView={() => canvasRef.current?.resetView()}
            onZoomIn={() => canvasRef.current?.zoomBy(1.4)}
            onZoomOut={() => canvasRef.current?.zoomBy(0.7)}
          />
        )}
      </div>

      {/* Center hint pill */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full px-3 py-1 text-[10px] font-medium pointer-events-none"
        style={{
          background: hintBg,
          border: `1px solid ${hintBorder}`,
          color: hintColor,
          backdropFilter: "blur(10px)",
        }}
      >
        Scroll to zoom · Drag empty space to pan · Click a node for details
      </div>

      {/* Bottom-left: legend */}
      <div className="absolute bottom-3 left-3 z-10">
        <GraphLegend allTypes={types} isDark={isDark} />
      </div>

      {/* Bottom-right: stats */}
      <div className="absolute bottom-3 right-3 z-10">
        <GraphStats nodes={nodes} edgeCount={links.length} allTypes={types} isDark={isDark} />
      </div>

      {/* Side panel */}
      <NodeDetailPanel
        node={selectedNode}
        nodes={nodes}
        links={links}
        allTypes={types}
        isDark={isDark}
        onClose={() => setSelectedNode(null)}
        onSelectNode={setSelectedNode}
      />
    </div>
  );
}
