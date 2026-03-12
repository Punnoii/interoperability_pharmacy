"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    group: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    label?: string;
}

interface SparqlBinding {
    substance: { type: string; value: string };
    substanceType: { type: string; value: string };
    nameValue: { type: string; value: string };
    identifierValue: { type: string; value: string };
}

// ย่อ IRI ให้อ่านง่าย: ตัด namespace prefix ออก
function shortenIri(iri: string): string {
    const hash = iri.lastIndexOf("#");
    if (hash !== -1) return iri.slice(hash + 1);
    const slash = iri.lastIndexOf("/");
    if (slash !== -1) return iri.slice(slash + 1);
    return iri;
}

// แปลง SPARQL bindings (substance query) → nodes + links
function bindingsToGraph(bindings: SparqlBinding[]): { nodes: GraphNode[]; links: GraphLink[] } {
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    const addNode = (id: string, group: number) => {
        if (!nodeMap.has(id)) nodeMap.set(id, { id, group });
    };

    bindings.forEach((b) => {
        const subId = b.substance.value;        // URI เช่น .../Substance/X
        const typeId = b.substanceType.value;    // URI ประเภทสาร
        const nameVal = b.nameValue.value;        // literal ชื่อสาร
        const idVal = b.identifierValue.value;  // literal รหัสสาร

        addNode(subId, 1);   // substance → group 1 (URI)
        addNode(typeId, 1);   // substanceType → group 1 (URI)
        addNode(nameVal, 2);   // nameValue → group 2 (literal)
        addNode(idVal, 3);   // identifierValue → group 3 (literal)

        links.push({ source: subId, target: typeId, label: "hasSubstanceType" });
        links.push({ source: subId, target: nameVal, label: "hasSubstanceName" });
        links.push({ source: subId, target: idVal, label: "isIdentifiedBy" });
    });

    return { nodes: Array.from(nodeMap.values()), links };
}

const SPARQL_QUERY = `
PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX idmp-dtp: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO21090-HarmonizedDatatypes/>
PREFIX cmns-id:  <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>

SELECT ?substance ?substanceType ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceType ?substanceType ;
             idmp-sub:hasSubstanceName ?nameNode ;
             cmns-id:isIdentifiedBy ?identifierNode .
  ?nameNode idmp-sub:hasSubstanceNameValue ?nameValue .
  ?identifierNode cmns-txt:hasTextValue ?identifierValue .
}
ORDER BY ?substance
LIMIT 50`.trim();
const color = d3.scaleOrdinal(d3.schemeTableau10);

export default function Graph() {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [nodeCount, setNodeCount] = useState(0);
    const [linkCount, setLinkCount] = useState(0);

    useEffect(() => {
        setStatus("loading");

        fetch(`/api/sparql`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: SPARQL_QUERY,
                endpoint: "default",
                accept: "application/sparql-results+json",
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                return res.json();
            })
            .then((data) => {
                const bindings: SparqlBinding[] = data?.results?.bindings ?? [];
                const { nodes, links } = bindingsToGraph(bindings);
                setNodeCount(nodes.length);
                setLinkCount(links.length);
                setStatus("done");
                renderGraph(nodes, links);
            })
            .catch((err) => {
                setErrorMsg(err.message);
                setStatus("error");
            });
    }, []);

    function renderGraph(nodes: GraphNode[], links: GraphLink[]) {
        const container = containerRef.current;
        const svgEl = svgRef.current;
        if (!container || !svgEl) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 500;

        const svg = d3.select(svgEl).attr("width", width).attr("height", height);
        svg.selectAll("*").remove();

        // Arrow marker
        svg.append("defs")
            .append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 28)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#94a3b8");

        const simulation = d3
            .forceSimulation<GraphNode>(nodes)
            .force("link", d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(140))
            .force("charge", d3.forceManyBody().strength(-250))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide(36));

        // Links
        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "#94a3b8")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)");

        // Link labels
        const linkLabel = svg.append("g")
            .selectAll<SVGTextElement, GraphLink>("text")
            .data(links)
            .join("text")
            .text((d) => d.label ?? "")
            .attr("font-size", 9)
            .attr("fill", "#64748b")
            .attr("text-anchor", "middle")
            .style("pointer-events", "none");

        // Nodes
        const node = svg.append("g")
            .selectAll<SVGGElement, GraphNode>("g")
            .data(nodes)
            .join("g")
            .style("cursor", "grab")
            .call(
                d3.drag<SVGGElement, GraphNode>()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x; d.fy = d.y;
                    })
                    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null; d.fy = null;
                    })
            );

        node.append("circle")
            .attr("r", 22)
            .attr("fill", (d) => color(String(d.group)))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Tooltip title
        node.append("title").text((d) => d.id);

        node.append("text")
            .text((d) => shortenIri(d.id).slice(0, 12))
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("fill", "#fff")
            .attr("font-size", 10)
            .attr("font-weight", "bold")
            .style("pointer-events", "none");

        simulation.on("tick", () => {
            link
                .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
                .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
                .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
                .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

            linkLabel
                .attr("x", (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
                .attr("y", (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2);

            node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

        return () => simulation.stop();
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 p-6 gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Substance Graph Viewer</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Query: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">
                            IDMP Substance — SELECT ?substance ?substanceType ?nameValue ?identifierValue … LIMIT 50
                        </code>
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    {status === "done" && (
                        <>
                            <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
                                🔵 <strong>{nodeCount}</strong> nodes
                            </span>
                            <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
                                🔗 <strong>{linkCount}</strong> links
                            </span>
                        </>
                    )}
                    {/* Legend */}
                    <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200 flex gap-2">
                        <span>🔵 Substance/Type</span>
                        <span>🟠 Name</span>
                        <span>🟢 Identifier</span>
                    </span>
                </div>
            </div>

            {/* Graph area */}
            <div
                ref={containerRef}
                className="flex-1 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden relative"
                style={{ minHeight: "500px" }}
            >
                {status === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <svg className="animate-spin mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        <p className="text-sm font-medium">Loading SPARQL data…</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-8">
                        <p className="text-lg font-semibold mb-1">Failed to load graph</p>
                        <p className="text-sm text-slate-500 text-center">{errorMsg}</p>
                    </div>
                )}

                <svg ref={svgRef} className="w-full h-full" />
            </div>
        </div>
    );
}