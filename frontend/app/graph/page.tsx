"use client";

import { useEffect, useState } from "react";
import GraphView from "@/components/graph/GraphView";
import {
  bindingsToGraph,
  SUBSTANCE_GRAPH_QUERY,
  type GraphLink,
  type GraphNode,
  type SparqlBinding,
} from "@/components/graph/graphUtils";

type Status = "idle" | "loading" | "done" | "error";

export default function GraphPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch("/api/sparql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: SUBSTANCE_GRAPH_QUERY,
        endpoint: "default",
        accept: "application/sparql-results+json",
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const bindings: SparqlBinding[] = data?.results?.bindings ?? [];
        const graph = bindingsToGraph(bindings);
        setNodes(graph.nodes);
        setLinks(graph.links);
        setStatus("done");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 p-6 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Substance Graph Viewer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Query:{" "}
            <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">
              IDMP Substance — SELECT ?substance ?substanceType ?nameValue ?identifierValue … LIMIT 50
            </code>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          {status === "done" && (
            <>
              <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
                <strong>{nodes.length}</strong> nodes
              </span>
              <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
                <strong>{links.length}</strong> links
              </span>
            </>
          )}
          <span className="bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200 flex gap-2">
            <span>Substance/Type</span>
            <span>Name</span>
            <span>Identifier</span>
          </span>
        </div>
      </header>

      {status === "loading" && (
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col items-center justify-center text-slate-400">
          <svg
            className="animate-spin mb-3"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <p className="text-sm font-medium">Loading SPARQL data…</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-slate-200 flex flex-col items-center justify-center text-red-400 p-8">
          <p className="text-lg font-semibold mb-1">Failed to load graph</p>
          <p className="text-sm text-slate-500 text-center">{errorMsg}</p>
        </div>
      )}

      {status === "done" && <GraphView nodes={nodes} links={links} />}
    </div>
  );
}
