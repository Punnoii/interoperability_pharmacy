export type SourceKey = "all" | "a" | "b" | "c" | "d" | "e";

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  source: SourceKey;
  query: string;
}

const PREFIXES = `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
`;

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: "tpl-all-substances",
    name: "All substances (name + identifier)",
    description: "List every substance with its name and identifier value.",
    keywords: ["list", "all", "substance", "ทั้งหมด", "รายการ", "name", "id"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substance ?substanceType ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceType ?substanceType ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
  ?i cmns-txt:hasTextValue ?identifierValue .
}
ORDER BY ?substance
LIMIT 50
`,
  },
  {
    id: "tpl-names-only",
    name: "Substance names only",
    description: "Just substance + preferred name. Useful as a list view.",
    keywords: ["name", "names", "ชื่อ", "label"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substance ?nameValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
}
ORDER BY ?nameValue
LIMIT 100
`,
  },
  {
    id: "tpl-identifiers-only",
    name: "Identifiers only (UNII / CAS / etc.)",
    description: "All substance identifiers — group by code authority.",
    keywords: ["id", "identifier", "code", "unii", "cas", "รหัส"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substance ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             cmns-id:isIdentifiedBy ?i .
  ?i cmns-txt:hasTextValue ?identifierValue .
}
ORDER BY ?identifierValue
LIMIT 100
`,
  },
  {
    id: "tpl-count-by-type",
    name: "Count substances by type",
    description: "GROUP BY substance type — quick distribution check.",
    keywords: ["count", "group", "type", "นับ", "ประเภท", "summary", "stats"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substanceType (COUNT(?substance) AS ?count)
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceType ?substanceType .
}
GROUP BY ?substanceType
ORDER BY DESC(?count)
`,
  },
  {
    id: "tpl-multiple-identifiers",
    name: "Substances with multiple identifiers",
    description: "Find substances that have more than one identifier value.",
    keywords: ["multiple", "duplicate", "หลาย", "identifier", "id"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substance (COUNT(DISTINCT ?identifierValue) AS ?idCount)
WHERE {
  ?substance a idmp-sub:Substance ;
             cmns-id:isIdentifiedBy ?i .
  ?i cmns-txt:hasTextValue ?identifierValue .
}
GROUP BY ?substance
HAVING (COUNT(DISTINCT ?identifierValue) > 1)
ORDER BY DESC(?idCount)
LIMIT 50
`,
  },
  {
    id: "tpl-by-name-contains",
    name: "Search substances by name (CONTAINS)",
    description: "Filter substances whose name contains a keyword (edit the FILTER).",
    keywords: ["search", "filter", "contains", "ค้นหา", "name", "keyword"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substance ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
  ?i cmns-txt:hasTextValue ?identifierValue .
  FILTER(CONTAINS(LCASE(?nameValue), "aspirin"))
}
LIMIT 50
`,
  },
  {
    id: "tpl-by-substance-iri",
    name: "Details of one specific substance",
    description: "Use when you have a known substance IRI — replaces {{IRI}}.",
    keywords: ["one", "iri", "detail", "specific", "เดี่ยว"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substanceType ?nameValue ?identifierValue
WHERE {
  <{{IRI}}> a idmp-sub:Substance ;
            idmp-sub:hasSubstanceType ?substanceType ;
            idmp-sub:hasSubstanceName ?n ;
            cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
  ?i cmns-txt:hasTextValue ?identifierValue .
}
`,
  },
  {
    id: "tpl-cross-source-by-id",
    name: "Cross-source: find substance by identifier",
    description: "Pivot on identifier value — see which sources have the same code.",
    keywords: ["cross", "source", "federation", "compare", "id", "เปรียบเทียบ"],
    source: "all",
    query: `${PREFIXES}
SELECT ?substance ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
  ?i cmns-txt:hasTextValue ?identifierValue .
  FILTER(?identifierValue = "R16CO5Y76E")
}
`,
  },
];
