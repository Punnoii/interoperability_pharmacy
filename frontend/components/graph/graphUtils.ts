import type * as d3 from "d3";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  group: number;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  label?: string;
}

export interface SparqlBinding {
  substance: { type: string; value: string };
  substanceType: { type: string; value: string };
  nameValue: { type: string; value: string };
  identifierValue: { type: string; value: string };
}

export function shortenIri(iri: string): string {
  const hash = iri.lastIndexOf("#");
  if (hash !== -1) return iri.slice(hash + 1);
  const slash = iri.lastIndexOf("/");
  if (slash !== -1) return iri.slice(slash + 1);
  return iri;
}

export function bindingsToGraph(
  bindings: SparqlBinding[]
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  const addNode = (id: string, group: number) => {
    if (!nodeMap.has(id)) nodeMap.set(id, { id, group });
  };

  bindings.forEach((b) => {
    const subId = b.substance.value;
    const typeId = b.substanceType.value;
    const nameVal = b.nameValue.value;
    const idVal = b.identifierValue.value;

    addNode(subId, 1);
    addNode(typeId, 1);
    addNode(nameVal, 2);
    addNode(idVal, 3);

    links.push({ source: subId, target: typeId, label: "hasSubstanceType" });
    links.push({ source: subId, target: nameVal, label: "hasSubstanceName" });
    links.push({ source: subId, target: idVal, label: "isIdentifiedBy" });
  });

  return { nodes: Array.from(nodeMap.values()), links };
}

export const SUBSTANCE_GRAPH_QUERY = `
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
