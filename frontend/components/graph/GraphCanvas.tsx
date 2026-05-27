"use client";

import * as d3 from "d3";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  getTypeMeta,
  truncate,
  type GraphLink,
  type GraphNode,
} from "./graphUtils";

export interface GraphCanvasHandle {
  resetView: () => void;
  zoomBy: (factor: number) => void;
}

interface GraphCanvasProps {
  nodes: GraphNode[];
  links: GraphLink[];
  allTypes: string[];
  isDark: boolean;
  selectedNodeId: string | null;
  searchTerm: string;
  onSelectNode: (node: GraphNode | null) => void;
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { nodes, links, allTypes, isDark, selectedNodeId, searchTerm, onSelectNode },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of links) {
      const s = typeof link.source === "string" ? link.source : link.source.id;
      const t = typeof link.target === "string" ? link.target : link.target.id;
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    }
    return map;
  }, [links]);

  useImperativeHandle(ref, () => ({
    resetView: () => {
      const svg = svgRef.current;
      const zoom = zoomBehaviorRef.current;
      if (!svg || !zoom) return;
      d3.select(svg).transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      nodes.forEach((n) => {
        n.fx = null;
        n.fy = null;
      });
      simulationRef.current?.alpha(0.5).restart();
    },
    zoomBy: (factor) => {
      const svg = svgRef.current;
      const zoom = zoomBehaviorRef.current;
      if (!svg || !zoom) return;
      d3.select(svg).transition().duration(250).call(zoom.scaleBy, factor);
    },
  }));

  useEffect(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    const edgeBase = isDark ? "#334155" : "#cbd5e1";
    const edgeHighlight = isDark ? "#cbd5e1" : "#1e293b";
    const labelColor = isDark ? "#94a3b8" : "#64748b";
    const dimOpacity = 0.35;

    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrow-base")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", edgeBase);
    defs
      .append("marker")
      .attr("id", "arrow-highlight")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", edgeHighlight);

    const root = svg.append("g").attr("class", "zoom-root");

    const linkGroup = root.append("g").attr("class", "links");
    const linkLabelGroup = root.append("g").attr("class", "link-labels");
    const nodeGroup = root.append("g").attr("class", "nodes");

    const linkSel = linkGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links, (d) => d.id)
      .join("line")
      .attr("stroke", edgeBase)
      .attr("stroke-width", 1.4)
      .attr("marker-end", "url(#arrow-base)");

    const linkLabelSel = linkLabelGroup
      .selectAll<SVGTextElement, GraphLink>("text")
      .data(links, (d) => d.id)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 8)
      .attr("font-weight", 500)
      .attr("fill", labelColor)
      .attr("stroke", isDark ? "#0f172a" : "#ffffff")
      .attr("stroke-width", 2.5)
      .attr("paint-order", "stroke")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("pointer-events", "none")
      .style("opacity", 0);

    const nodeSel = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(nodes, (d) => d.id)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    const nodeRadius = (d: GraphNode) => 10 + Math.sqrt(Math.max(1, d.degree)) * 3.2;

    nodeSel
      .append("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => {
        const meta = getTypeMeta(d.type, allTypes);
        return isDark ? meta.colorDark : meta.color;
      })
      .attr("stroke", isDark ? "#0f172a" : "#ffffff")
      .attr("stroke-width", 2.5);

    const labelFill = isDark ? "#e2e8f0" : "#1e293b";
    const labelHalo = isDark ? "#0f172a" : "#ffffff";

    nodeSel
      .append("text")
      .text((d) => truncate(d.label, 26))
      .attr("text-anchor", "middle")
      .attr("y", (d) => nodeRadius(d) + 14)
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("fill", labelFill)
      .attr("stroke", labelHalo)
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .style("opacity", 1)
      .style("pointer-events", "none")
      .style("user-select", "none");

    nodeSel.append("title").text((d) => `${d.type}: ${d.id}\nConnections: ${d.degree}`);

    const applyHighlight = (focusId: string | null) => {
      if (!focusId) {
        nodeSel.style("opacity", 1);
        nodeSel.select("circle").attr("fill-opacity", 1).attr("stroke-width", 2.5);
        nodeSel.select("text").style("opacity", 1);
        linkSel
          .attr("stroke", edgeBase)
          .attr("stroke-width", 1.4)
          .attr("marker-end", "url(#arrow-base)")
          .style("opacity", 1);
        linkLabelSel.style("opacity", 0);
        return;
      }
      const neighbors = adjacency.get(focusId) ?? new Set<string>();
      neighbors.add(focusId);
      nodeSel.style("opacity", 1);
      nodeSel
        .select("circle")
        .attr("fill-opacity", (d) => (neighbors.has(d.id) ? 1 : dimOpacity))
        .attr("stroke-width", (d) => (d.id === focusId ? 4 : 2.5));
      nodeSel
        .select("text")
        .style("opacity", (d) => (neighbors.has(d.id) ? 1 : dimOpacity));

      linkSel
        .attr("stroke", (d) => {
          const s = typeof d.source === "string" ? d.source : d.source.id;
          const t = typeof d.target === "string" ? d.target : d.target.id;
          return s === focusId || t === focusId ? edgeHighlight : edgeBase;
        })
        .attr("stroke-width", (d) => {
          const s = typeof d.source === "string" ? d.source : d.source.id;
          const t = typeof d.target === "string" ? d.target : d.target.id;
          return s === focusId || t === focusId ? 2.4 : 1.2;
        })
        .attr("marker-end", (d) => {
          const s = typeof d.source === "string" ? d.source : d.source.id;
          const t = typeof d.target === "string" ? d.target : d.target.id;
          return s === focusId || t === focusId ? "url(#arrow-highlight)" : "url(#arrow-base)";
        })
        .style("opacity", (d) => {
          const s = typeof d.source === "string" ? d.source : d.source.id;
          const t = typeof d.target === "string" ? d.target : d.target.id;
          return s === focusId || t === focusId ? 1 : dimOpacity;
        });

      linkLabelSel
        .style("opacity", (d) => {
          const s = typeof d.source === "string" ? d.source : d.source.id;
          const t = typeof d.target === "string" ? d.target : d.target.id;
          return s === focusId || t === focusId ? 1 : 0;
        })
        .attr("fill", (d) => {
          const s = typeof d.source === "string" ? d.source : d.source.id;
          const t = typeof d.target === "string" ? d.target : d.target.id;
          return s === focusId || t === focusId ? edgeHighlight : labelColor;
        });
    };

    nodeSel
      .on("mouseenter", function (_, d) {
        if (selectedNodeId) return;
        applyHighlight(d.id);
      })
      .on("mouseleave", function () {
        if (selectedNodeId) {
          applyHighlight(selectedNodeId);
        } else {
          applyHighlight(null);
        }
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        onSelectNode(d);
      });

    svg.on("click", () => onSelectNode(null));

    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = event.x;
        d.fy = event.y;
      });

    nodeSel.call(drag);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on("zoom", (event) => root.attr("transform", event.transform.toString()));
    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(85)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d) + 22)
      )
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.04));

    simulationRef.current = simulation;

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      linkLabelSel
        .attr("x", (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr("y", (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2);

      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    if (selectedNodeId) applyHighlight(selectedNodeId);

    return () => {
      simulation.stop();
    };
  }, [nodes, links, allTypes, isDark, adjacency, onSelectNode]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);

    const nodeSel = svg.selectAll<SVGGElement, GraphNode>("g.node");
    const linkSel = svg.selectAll<SVGLineElement, GraphLink>("g.links line");
    const linkLabelSel = svg.selectAll<SVGTextElement, GraphLink>("g.link-labels text");

    const edgeBase = isDark ? "#334155" : "#cbd5e1";
    const edgeHighlight = isDark ? "#cbd5e1" : "#1e293b";
    const labelColor = isDark ? "#94a3b8" : "#64748b";
    const dimOpacity = 0.35;

    const focusId = selectedNodeId;
    const lowerSearch = searchTerm.trim().toLowerCase();

    nodeSel.style("opacity", 1);

    if (lowerSearch.length > 0) {
      const matches = new Set(
        nodes
          .filter((n) => n.label.toLowerCase().includes(lowerSearch) || n.id.toLowerCase().includes(lowerSearch))
          .map((n) => n.id)
      );
      nodeSel
        .select("circle")
        .attr("fill-opacity", (d) => (matches.has(d.id) ? 1 : dimOpacity))
        .attr("stroke-width", (d) => (matches.has(d.id) ? 4 : 2.5));
      nodeSel
        .select("text")
        .style("opacity", (d) => (matches.has(d.id) ? 1 : dimOpacity));
      linkSel.style("opacity", 0.25);
      linkLabelSel.style("opacity", 0);
      return;
    }

    if (!focusId) {
      nodeSel.select("circle").attr("fill-opacity", 1).attr("stroke-width", 2.5);
      nodeSel.select("text").style("opacity", 1);
      linkSel
        .attr("stroke", edgeBase)
        .attr("stroke-width", 1.4)
        .attr("marker-end", "url(#arrow-base)")
        .style("opacity", 1);
      linkLabelSel.style("opacity", 0);
      return;
    }

    const neighbors = new Set<string>([focusId]);
    for (const link of links) {
      const s = typeof link.source === "string" ? link.source : link.source.id;
      const t = typeof link.target === "string" ? link.target : link.target.id;
      if (s === focusId) neighbors.add(t);
      if (t === focusId) neighbors.add(s);
    }

    nodeSel
      .select("circle")
      .attr("fill-opacity", (d) => (neighbors.has(d.id) ? 1 : dimOpacity))
      .attr("stroke-width", (d) => (d.id === focusId ? 4 : 2.5));
    nodeSel
      .select("text")
      .style("opacity", (d) => (neighbors.has(d.id) ? 1 : dimOpacity));

    linkSel
      .attr("stroke", (d) => {
        const s = typeof d.source === "string" ? d.source : d.source.id;
        const t = typeof d.target === "string" ? d.target : d.target.id;
        return s === focusId || t === focusId ? edgeHighlight : edgeBase;
      })
      .attr("stroke-width", (d) => {
        const s = typeof d.source === "string" ? d.source : d.source.id;
        const t = typeof d.target === "string" ? d.target : d.target.id;
        return s === focusId || t === focusId ? 2.4 : 1.2;
      })
      .attr("marker-end", (d) => {
        const s = typeof d.source === "string" ? d.source : d.source.id;
        const t = typeof d.target === "string" ? d.target : d.target.id;
        return s === focusId || t === focusId ? "url(#arrow-highlight)" : "url(#arrow-base)";
      })
      .style("opacity", (d) => {
        const s = typeof d.source === "string" ? d.source : d.source.id;
        const t = typeof d.target === "string" ? d.target : d.target.id;
        return s === focusId || t === focusId ? 1 : dimOpacity;
      });

    linkLabelSel
      .style("opacity", (d) => {
        const s = typeof d.source === "string" ? d.source : d.source.id;
        const t = typeof d.target === "string" ? d.target : d.target.id;
        return s === focusId || t === focusId ? 1 : 0;
      })
      .attr("fill", (d) => {
        const s = typeof d.source === "string" ? d.source : d.source.id;
        const t = typeof d.target === "string" ? d.target : d.target.id;
        return s === focusId || t === focusId ? edgeHighlight : labelColor;
      });
  }, [selectedNodeId, searchTerm, nodes, links, isDark]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className={`w-full h-full ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
      />
    </div>
  );
});

export default GraphCanvas;
