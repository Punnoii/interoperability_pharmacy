"use client";

import * as d3 from "d3";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { getTypeMeta, truncate, type GraphLink, type GraphNode } from "./graphUtils";

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

const LABEL_HIDE_ZOOM = 0.45;
const DIM = 0.2;

function endpointId(end: string | GraphNode): string {
  return typeof end === "string" ? end : end.id;
}

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { nodes, links, allTypes, isDark, selectedNodeId, searchTerm, onSelectNode },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const onSelectRef = useRef(onSelectNode);
  onSelectRef.current = onSelectNode;

  const colors = useMemo(() => ({
    edge:      isDark ? "#334155" : "#cbd5e1",
    edgeHi:    isDark ? "#cbd5e1" : "#1e293b",
    labelFill: isDark ? "#e2e8f0" : "#1e293b",
    labelHalo: isDark ? "#0f172a" : "#ffffff",
    linkLabel: isDark ? "#94a3b8" : "#64748b",
  }), [isDark]);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of links) {
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    }
    return m;
  }, [links]);

  useImperativeHandle(ref, () => ({
    resetView: () => {
      const svg = svgRef.current;
      const zoom = zoomRef.current;
      if (!svg || !zoom) return;
      d3.select(svg).transition().duration(400).call(zoom.transform, d3.zoomIdentity);
      nodes.forEach((n) => {
        n.fx = null;
        n.fy = null;
      });
      simRef.current?.alpha(0.4).restart();
    },
    zoomBy: (factor) => {
      const svg = svgRef.current;
      const zoom = zoomRef.current;
      if (!svg || !zoom) return;
      d3.select(svg).transition().duration(200).call(zoom.scaleBy, factor);
    },
  }));

  useEffect(() => {
    const svgEl = svgRef.current;
    const wrap = wrapRef.current;
    if (!svgEl || !wrap) return;

    const W = wrap.clientWidth || 800;
    const H = wrap.clientHeight || 600;
    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("*").remove();

    const { edge: edgeColor, edgeHi, labelFill, labelHalo, linkLabel: linkLabelColor } = colors;

    const defs = svg.append("defs");
    const arrow = (id: string, color: string, size: number) =>
      defs
        .append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 18)
        .attr("markerWidth", size)
        .attr("markerHeight", size)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    arrow("arrow-base", edgeColor, 6);
    arrow("arrow-hi", edgeHi, 7);

    const root = svg.append("g");
    const linkLayer = root.append("g");
    const linkLabelLayer = root.append("g");
    const nodeLayer = root.append("g");

    const radius = (d: GraphNode) => 10 + Math.sqrt(Math.max(1, d.degree)) * 3.2;

    const linkSel = linkLayer
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links, (d) => d.id)
      .join("line")
      .attr("stroke", edgeColor)
      .attr("stroke-width", 1.4)
      .attr("marker-end", "url(#arrow-base)");

    const linkLabelSel = linkLabelLayer
      .selectAll<SVGTextElement, GraphLink>("text")
      .data(links, (d) => d.id)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 8)
      .attr("font-weight", 500)
      .attr("fill", linkLabelColor)
      .attr("stroke", labelHalo)
      .attr("stroke-width", 2.5)
      .attr("paint-order", "stroke")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("pointer-events", "none")
      .style("opacity", 0);

    const nodeSel = nodeLayer
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(nodes, (d) => d.id)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    nodeSel
      .append("circle")
      .attr("r", radius)
      .attr("fill", (d) => {
        const meta = getTypeMeta(d.type, allTypes);
        return isDark ? meta.colorDark : meta.color;
      })
      .attr("stroke", isDark ? "#0f172a" : "#ffffff")
      .attr("stroke-width", 2.5);

    const labelSel = nodeSel
      .append("text")
      .text((d) => truncate(d.label, 26))
      .attr("text-anchor", "middle")
      .attr("y", (d) => radius(d) + 14)
      .attr("font-size", 11)
      .attr("font-weight", 500)
      .attr("fill", labelFill)
      .attr("stroke", labelHalo)
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .style("pointer-events", "none")
      .style("user-select", "none");

    nodeSel.append("title").text((d) => `${d.type}: ${d.id}\nConnections: ${d.degree}`);

    nodeSel
      .on("mouseenter", function (_, d) {
        if (selectedNodeId) return;
        applyFocus(d.id);
      })
      .on("mouseleave", function () {
        applyFocus(selectedNodeId);
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        onSelectRef.current(d);
      });

    svg.on("click", () => onSelectRef.current(null));

    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (e, d) => {
        if (!e.active) simRef.current?.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) simRef.current?.alphaTarget(0);
        d.fx = e.x;
        d.fy = e.y;
      });

    nodeSel.call(drag);

    let zoomK = 1;
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
        const k = event.transform.k;
        if ((zoomK < LABEL_HIDE_ZOOM) !== (k < LABEL_HIDE_ZOOM)) {
          labelSel.style("display", k < LABEL_HIDE_ZOOM ? "none" : null);
        }
        zoomK = k;
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    const linkCount = links.length;
    const nodeCount = nodes.length;
    const decay = nodeCount > 200 ? 0.05 : 0.0228;

    const sim = d3
      .forceSimulation<GraphNode>(nodes)
      .alphaDecay(decay)
      .velocityDecay(0.45)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(85)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(nodeCount > 200 ? -180 : -260))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius((d) => radius(d) + 22))
      .force("x", d3.forceX(W / 2).strength(0.04))
      .force("y", d3.forceY(H / 2).strength(0.04));

    simRef.current = sim;

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    sim.on("end", () => {
      linkLabelSel
        .attr("x", (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr("y", (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2);
    });

    function applyFocus(focusId: string | null) {
      if (!focusId) {
        nodeSel.select("circle").attr("fill-opacity", 1).attr("stroke-width", 2.5);
        nodeSel.select("text").style("opacity", null);
        linkSel
          .attr("stroke", edgeColor)
          .attr("stroke-width", 1.4)
          .attr("marker-end", "url(#arrow-base)")
          .style("opacity", 1);
        linkLabelSel.style("opacity", 0);
        return;
      }
      const near = adjacency.get(focusId) ?? new Set<string>();
      near.add(focusId);

      nodeSel
        .select("circle")
        .attr("fill-opacity", (d) => (near.has(d.id) ? 1 : DIM))
        .attr("stroke-width", (d) => (d.id === focusId ? 4 : 2.5));
      nodeSel.select("text").style("opacity", (d) => (near.has(d.id) ? 1 : DIM));

      linkSel.each(function (d) {
        const hit = endpointId(d.source) === focusId || endpointId(d.target) === focusId;
        const el = d3.select(this);
        el.attr("stroke", hit ? edgeHi : edgeColor)
          .attr("stroke-width", hit ? 2.4 : 1.2)
          .attr("marker-end", hit ? "url(#arrow-hi)" : "url(#arrow-base)")
          .style("opacity", hit ? 1 : DIM);
      });

      linkLabelSel.each(function (d) {
        const hit = endpointId(d.source) === focusId || endpointId(d.target) === focusId;
        const el = d3.select(this);
        el.style("opacity", hit ? 1 : 0).attr("fill", hit ? edgeHi : linkLabelColor);
        if (hit) {
          const sx = (d.source as GraphNode).x ?? 0;
          const sy = (d.source as GraphNode).y ?? 0;
          const tx = (d.target as GraphNode).x ?? 0;
          const ty = (d.target as GraphNode).y ?? 0;
          el.attr("x", (sx + tx) / 2).attr("y", (sy + ty) / 2);
        }
      });
    }

    if (selectedNodeId) applyFocus(selectedNodeId);

    return () => {
      sim.stop();
    };
  }, [nodes, links, allTypes, isDark, adjacency, colors]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const sel = d3.select(svg);
    const nodeSel = sel.selectAll<SVGGElement, GraphNode>("g.node");
    const linkSel = sel.selectAll<SVGLineElement, GraphLink>("g line");

    const term = searchTerm.trim().toLowerCase();
    if (!term) return;

    const matches = new Set(
      nodes
        .filter((n) => n.label.toLowerCase().includes(term) || n.id.toLowerCase().includes(term))
        .map((n) => n.id)
    );

    nodeSel
      .select("circle")
      .attr("fill-opacity", (d) => (matches.has(d.id) ? 1 : DIM))
      .attr("stroke-width", (d) => (matches.has(d.id) ? 4 : 2.5));
    nodeSel.select("text").style("opacity", (d) => (matches.has(d.id) ? 1 : DIM));
    linkSel.style("opacity", 0.25);
  }, [searchTerm, nodes]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const sel = d3.select(svg);
    const nodeSel = sel.selectAll<SVGGElement, GraphNode>("g.node");
    const linkSel = sel.selectAll<SVGLineElement, GraphLink>("g line");
    const linkLabelSel = sel.selectAll<SVGTextElement, GraphLink>("g text");

    const { edge: edgeColor, edgeHi, linkLabel: linkLabelColor } = colors;

    const focusId = selectedNodeId;
    if (!focusId) {
      nodeSel.select("circle").attr("fill-opacity", 1).attr("stroke-width", 2.5);
      nodeSel.select("text").style("opacity", null);
      linkSel
        .attr("stroke", edgeColor)
        .attr("stroke-width", 1.4)
        .attr("marker-end", "url(#arrow-base)")
        .style("opacity", 1);
      linkLabelSel.style("opacity", 0);
      return;
    }

    const near = new Set<string>([focusId]);
    for (const l of links) {
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      if (s === focusId) near.add(t);
      if (t === focusId) near.add(s);
    }

    nodeSel
      .select("circle")
      .attr("fill-opacity", (d) => (near.has(d.id) ? 1 : DIM))
      .attr("stroke-width", (d) => (d.id === focusId ? 4 : 2.5));
    nodeSel.select("text").style("opacity", (d) => (near.has(d.id) ? 1 : DIM));

    linkSel.each(function (d) {
      const hit = endpointId(d.source) === focusId || endpointId(d.target) === focusId;
      const el = d3.select(this);
      el.attr("stroke", hit ? edgeHi : edgeColor)
        .attr("stroke-width", hit ? 2.4 : 1.2)
        .attr("marker-end", hit ? "url(#arrow-hi)" : "url(#arrow-base)")
        .style("opacity", hit ? 1 : DIM);
    });

    linkLabelSel.each(function (d) {
      const hit = endpointId(d.source) === focusId || endpointId(d.target) === focusId;
      const el = d3.select(this);
      el.style("opacity", hit ? 1 : 0).attr("fill", hit ? edgeHi : linkLabelColor);
    });
  }, [selectedNodeId, links, isDark, colors]);

  return (
    <div ref={wrapRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className={`w-full h-full ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
        style={{ willChange: "transform" }}
      />
    </div>
  );
});

export default GraphCanvas;
