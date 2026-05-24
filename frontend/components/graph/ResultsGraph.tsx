"use client";

import { useMemo, useRef, useState } from "react";
import GraphCanvas, { type GraphCanvasHandle } from "./GraphCanvas";
import GraphControls from "./GraphControls";
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

export default function ResultsGraph({ vars, bindings, isDark }: ResultsGraphProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const canvasRef = useRef<GraphCanvasHandle>(null);

  const { nodes, links, types } = useMemo(
    () => bindingsToGenericGraph(vars, bindings),
    [vars, bindings]
  );

  if (nodes.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
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

      <div className="absolute top-3 left-3 z-10">
        <GraphSearch value={searchTerm} onChange={setSearchTerm} isDark={isDark} />
      </div>

      {!selectedNode && (
        <div className="absolute top-3 right-3 z-10">
          <GraphControls
            isDark={isDark}
            onResetView={() => canvasRef.current?.resetView()}
            onZoomIn={() => canvasRef.current?.zoomBy(1.4)}
            onZoomOut={() => canvasRef.current?.zoomBy(0.7)}
          />
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-10">
        <GraphStats nodes={nodes} edgeCount={links.length} allTypes={types} isDark={isDark} />
      </div>

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
