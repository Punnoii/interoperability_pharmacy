import type * as d3 from "d3";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  label: string;
  degree: number;
  isUri: boolean;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

export type SparqlCell = { type: string; value: string; datatype?: string; "xml:lang"?: string };
export type SparqlBinding = Record<string, SparqlCell>;

export interface NodeTypeMeta {
  label: string;
  color: string;
  colorDark: string;
  textColor: string;
}

const PALETTE: Omit<NodeTypeMeta, "label">[] = [
  { color: "#6366f1", colorDark: "#818cf8", textColor: "#ffffff" },
  { color: "#a855f7", colorDark: "#c084fc", textColor: "#ffffff" },
  { color: "#10b981", colorDark: "#34d399", textColor: "#ffffff" },
  { color: "#f59e0b", colorDark: "#fbbf24", textColor: "#1a1a1a" },
  { color: "#06b6d4", colorDark: "#22d3ee", textColor: "#ffffff" },
  { color: "#ec4899", colorDark: "#f472b6", textColor: "#ffffff" },
  { color: "#ef4444", colorDark: "#f87171", textColor: "#ffffff" },
  { color: "#84cc16", colorDark: "#a3e635", textColor: "#1a1a1a" },
];

export function getTypeMeta(typeKey: string, allTypes: string[]): NodeTypeMeta {
  const idx = allTypes.indexOf(typeKey);
  const palette = PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
  return { label: typeKey, ...palette };
}

export function shortenIri(iri: string): string {
  const hash = iri.lastIndexOf("#");
  if (hash !== -1) return iri.slice(hash + 1);
  const slash = iri.lastIndexOf("/");
  if (slash !== -1) return iri.slice(slash + 1);
  return iri;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export function bindingsToGenericGraph(
  vars: string[],
  bindings: SparqlBinding[]
): { nodes: GraphNode[]; links: GraphLink[]; types: string[] } {
  if (vars.length < 2 || bindings.length === 0) {
    return { nodes: [], links: [], types: [] };
  }

  const nodeMap = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();
  const degree = new Map<string, number>();
  const usedTypes = new Set<string>();

  const addNode = (cell: SparqlCell, typeKey: string) => {
    if (!cell || !cell.value) return;
    usedTypes.add(typeKey);
    if (!nodeMap.has(cell.value)) {
      const isUri = cell.type === "uri";
      nodeMap.set(cell.value, {
        id: cell.value,
        type: typeKey,
        label: isUri ? shortenIri(cell.value) : cell.value,
        degree: 0,
        isUri,
      });
    }
  };

  const addLink = (sourceId: string, targetId: string, label: string) => {
    const key = `${sourceId}::${label}::${targetId}`;
    if (linkMap.has(key)) return;
    linkMap.set(key, { id: key, source: sourceId, target: targetId, label });
    degree.set(sourceId, (degree.get(sourceId) ?? 0) + 1);
    degree.set(targetId, (degree.get(targetId) ?? 0) + 1);
  };

  const isSpo =
    vars.length === 3 &&
    bindings.every((b) => b[vars[1]]?.type === "uri");

  if (isSpo) {
    const [sVar, pVar, oVar] = vars;
    for (const b of bindings) {
      const s = b[sVar];
      const p = b[pVar];
      const o = b[oVar];
      if (!s?.value || !p?.value || !o?.value) continue;
      addNode(s, sVar);
      addNode(o, oVar);
      addLink(s.value, o.value, shortenIri(p.value));
    }
  } else {
    const [entityVar, ...attrVars] = vars;
    for (const b of bindings) {
      const ent = b[entityVar];
      if (!ent?.value) continue;
      addNode(ent, entityVar);
      for (const av of attrVars) {
        const cell = b[av];
        if (!cell?.value) continue;
        addNode(cell, av);
        addLink(ent.value, cell.value, av);
      }
    }
  }

  const nodes = Array.from(nodeMap.values()).map((n) => ({
    ...n,
    degree: degree.get(n.id) ?? 0,
  }));
  const types = vars.filter((v) => usedTypes.has(v));

  return { nodes, links: Array.from(linkMap.values()), types };
}
