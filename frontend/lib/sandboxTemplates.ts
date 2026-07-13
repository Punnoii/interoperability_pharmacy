import type { QueryTemplate } from "./queryTemplates";

// starter queries for the sandbox (user-uploaded ontology) — generic RDF/OWL/SKOS, no IDMP prefixes since the schema is unknown
const COMMON_PREFIXES = `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
`;

// what the sandbox editor is pre-filled with on first load
export const SANDBOX_DEFAULT_QUERY = `${COMMON_PREFIXES}
SELECT ?subject ?predicate ?object
WHERE { ?subject ?predicate ?object }
LIMIT 25
`;

// schema-discovery queries — list classes/predicates/labels to help a user probe an unfamiliar upload
export const SANDBOX_TEMPLATES: QueryTemplate[] = [
  {
    id: "sb-peek",
    name: "Peek - first 25 triples",
    description: "See what's in the dataset.",
    keywords: ["peek", "sample", "first", "preview", "ดู"],
    source: "all",
    query: `${COMMON_PREFIXES}
SELECT ?s ?p ?o
WHERE { ?s ?p ?o }
LIMIT 25
`,
  },
  {
    id: "sb-count",
    name: "Count all triples",
    description: "How many triples are loaded in this sandbox.",
    keywords: ["count", "total", "นับ", "stats"],
    source: "all",
    query: `SELECT (COUNT(*) AS ?triples)
WHERE { ?s ?p ?o }
`,
  },
  {
    id: "sb-list-classes",
    name: "List all classes",
    description: "Every distinct RDF class declared in the ontology.",
    keywords: ["class", "type", "owl", "ประเภท"],
    source: "all",
    query: `${COMMON_PREFIXES}
SELECT DISTINCT ?class
WHERE { ?class a owl:Class }
ORDER BY ?class
LIMIT 100
`,
  },
  {
    id: "sb-count-by-class",
    name: "Count instances by class",
    description: "How many individuals exist per class - quick distribution check.",
    keywords: ["count", "class", "group", "distribution", "นับ"],
    source: "all",
    query: `SELECT ?class (COUNT(?s) AS ?n)
WHERE { ?s a ?class }
GROUP BY ?class
ORDER BY DESC(?n)
LIMIT 30
`,
  },
  {
    id: "sb-list-predicates",
    name: "List all predicates",
    description: "Distinct predicates used in the data.",
    keywords: ["predicate", "property", "relation", "ความสัมพันธ์"],
    source: "all",
    query: `SELECT DISTINCT ?predicate
WHERE { ?s ?predicate ?o }
ORDER BY ?predicate
LIMIT 100
`,
  },
  {
    id: "sb-class-hierarchy",
    name: "Class hierarchy (subClassOf)",
    description: "Parent / child relationships between classes.",
    keywords: ["hierarchy", "subclass", "parent", "tree", "ลำดับชั้น"],
    source: "all",
    query: `${COMMON_PREFIXES}
SELECT ?subClass ?superClass
WHERE { ?subClass rdfs:subClassOf ?superClass }
ORDER BY ?superClass ?subClass
LIMIT 100
`,
  },
  {
    id: "sb-labels",
    name: "Labels (rdfs:label / skos:prefLabel)",
    description: "Every resource with its human-readable label.",
    keywords: ["label", "name", "ชื่อ", "preferred"],
    source: "all",
    query: `${COMMON_PREFIXES}
SELECT ?subject ?label
WHERE {
  { ?subject rdfs:label    ?label }
  UNION
  { ?subject skos:prefLabel ?label }
}
LIMIT 100
`,
  },
  {
    id: "sb-top-classes",
    name: "Top-level classes (no parent)",
    description: "Classes that are not subclassOf anything (except owl:Thing).",
    keywords: ["root", "top", "parent", "หัว"],
    source: "all",
    query: `${COMMON_PREFIXES}
SELECT ?class
WHERE {
  ?class a owl:Class .
  FILTER NOT EXISTS {
    ?class rdfs:subClassOf ?parent .
    FILTER (?parent != owl:Thing && ?parent != ?class)
  }
}
ORDER BY ?class
LIMIT 50
`,
  },
  {
    id: "sb-resource-details",
    name: "Details of one resource (paste IRI)",
    description: "All properties of one resource - replace {{IRI}} with the full IRI you want to inspect.",
    keywords: ["detail", "resource", "iri", "เดี่ยว"],
    source: "all",
    query: `SELECT ?predicate ?object
WHERE { <{{IRI}}> ?predicate ?object }
LIMIT 100
`,
  },
  {
    id: "sb-ontology-meta",
    name: "Ontology metadata",
    description: "Find the ontology IRI and its title / version info.",
    keywords: ["ontology", "metadata", "version", "info"],
    source: "all",
    query: `${COMMON_PREFIXES}
SELECT ?ontology ?predicate ?value
WHERE {
  ?ontology a owl:Ontology .
  ?ontology ?predicate ?value .
}
LIMIT 50
`,
  },
];
