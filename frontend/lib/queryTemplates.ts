export type SourceKey = "all" | "a" | "b" | "c" | "d" | "e";

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  source: SourceKey;
  query: string;
}

const PREFIXES_SUB = `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
`;

const PREFIXES_PRD = `PREFIX idmp-mprd: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/>
PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
`;

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: "tpl-all-substances",
    name: "All substances (preferred name + UNII)",
    description: "One row per substance — preferred name + UNII identifier. Best for similarity comparisons.",
    keywords: ["list", "all", "substance", "ทั้งหมด", "รายการ", "name", "id", "preferred"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT ?substance (SAMPLE(?nm) AS ?name) (SAMPLE(?id) AS ?identifier)
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nm ;
     idmp-sub:hasSubstanceNameType idmp-sub:SubstanceNameClassifier-PreferredName .
  ?i cmns-txt:hasTextValue ?id .
}
GROUP BY ?substance
LIMIT 100
`,
  },
  {
    id: "tpl-names-only",
    name: "Substance names (preferred only)",
    description: "Substance IRI + the preferred name for each.",
    keywords: ["name", "names", "ชื่อ", "label", "preferred"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT ?substance ?nameValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue ;
     idmp-sub:hasSubstanceNameType idmp-sub:SubstanceNameClassifier-PreferredName .
}
ORDER BY ?nameValue
LIMIT 100
`,
  },
  {
    id: "tpl-identifiers-only",
    name: "Substance UNII identifiers",
    description: "Every substance with its UNII identifier value.",
    keywords: ["id", "identifier", "code", "unii", "รหัส"],
    source: "all",
    query: `${PREFIXES_SUB}
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
    id: "tpl-count-substances",
    name: "Count total substances",
    description: "How many substances are in the federation.",
    keywords: ["count", "total", "นับ", "summary", "stats"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT (COUNT(DISTINCT ?substance) AS ?total)
WHERE {
  ?substance a idmp-sub:Substance .
}
`,
  },
  {
    id: "tpl-substances-with-many-names",
    name: "Substances with the most synonyms",
    description: "Find substances that have many name variants (synonyms, code names, brand names).",
    keywords: ["synonym", "many", "names", "หลาย", "ชื่อ", "variants"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT ?substance (COUNT(DISTINCT ?nameValue) AS ?nameCount)
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
}
GROUP BY ?substance
HAVING (COUNT(DISTINCT ?nameValue) > 5)
ORDER BY DESC(?nameCount)
LIMIT 30
`,
  },
  {
    id: "tpl-search-by-name",
    name: "Search substances by name (CONTAINS)",
    description: "Filter substances whose preferred name contains a keyword — edit the FILTER string.",
    keywords: ["search", "filter", "contains", "ค้นหา", "name", "keyword"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT ?substance ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue ;
     idmp-sub:hasSubstanceNameType idmp-sub:SubstanceNameClassifier-PreferredName .
  ?i cmns-txt:hasTextValue ?identifierValue .
  FILTER(CONTAINS(LCASE(?nameValue), "aspirin"))
}
LIMIT 50
`,
  },
  {
    id: "tpl-find-by-unii",
    name: "Find substance by UNII code",
    description: "Look up the substance that has a specific UNII identifier — edit the code in the FILTER.",
    keywords: ["unii", "lookup", "code", "find", "specific"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT ?substance ?nameValue ?identifierValue
WHERE {
  ?substance a idmp-sub:Substance ;
             idmp-sub:hasSubstanceName ?n ;
             cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue ;
     idmp-sub:hasSubstanceNameType idmp-sub:SubstanceNameClassifier-PreferredName .
  ?i cmns-txt:hasTextValue ?identifierValue .
  FILTER(?identifierValue = "R16CO5Y76E")
}
`,
  },
  {
    id: "tpl-all-products",
    name: "All medicinal products (FDA NDC)",
    description: "List FDA-approved medicinal products with their NDC code and product name.",
    keywords: ["product", "drug", "medicine", "ยา", "fda", "ndc"],
    source: "all",
    query: `${PREFIXES_PRD}
SELECT ?product ?productName ?ndcCode
WHERE {
  ?product a idmp-mprd:MedicinalProduct ;
           cmns-dsg:hasName ?n ;
           cmns-id:isIdentifiedBy ?i .
  ?n idmp-mprd:hasFullMedicinalProductName ?productName .
  ?i cmns-txt:hasTextValue ?ndcCode .
}
LIMIT 100
`,
  },
  {
    id: "tpl-products-by-ingredient",
    name: "Products containing a specific ingredient",
    description: "Find drugs that include a given active ingredient — edit the FILTER string.",
    keywords: ["ingredient", "active", "drug", "ส่วนผสม", "สาร", "contain"],
    source: "all",
    query: `${PREFIXES_PRD}
SELECT DISTINCT ?productName ?ingredientName
WHERE {
  ?product idmp-mprd:hasActiveIngredient ?ingredient ;
           cmns-dsg:hasName ?pn .
  ?pn idmp-mprd:hasFullMedicinalProductName ?productName .
  ?ingredient idmp-sub:hasSubstanceName ?in .
  ?in idmp-sub:hasSubstanceNameValue ?ingredientName .
  FILTER(CONTAINS(LCASE(?ingredientName), "ibuprofen"))
}
LIMIT 50
`,
  },
  {
    id: "tpl-packages",
    name: "Drug packaging (NDC package codes)",
    description: "List packaged drug variants with their package NDC code and description.",
    keywords: ["package", "ndc", "packaging", "บรรจุภัณฑ์"],
    source: "all",
    query: `${PREFIXES_PRD}
SELECT ?packageCode ?packageDesc ?productName
WHERE {
  ?pkg a idmp-mprd:PackagedMedicinalProduct ;
       cmns-dsg:hasDescription ?packageDesc ;
       cmns-dsg:isDefinedIn ?product ;
       cmns-id:isIdentifiedBy ?pi .
  ?pi cmns-txt:hasTextValue ?packageCode .
  ?product cmns-dsg:hasName ?pn .
  ?pn idmp-mprd:hasFullMedicinalProductName ?productName .
}
LIMIT 50
`,
  },
  {
    id: "tpl-count-by-class",
    name: "Count entities by RDF class",
    description: "Distribution check — how many of each class exist in the graph.",
    keywords: ["count", "group", "class", "type", "นับ", "ประเภท", "stats"],
    source: "all",
    query: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?class (COUNT(?s) AS ?count)
WHERE {
  ?s rdf:type ?class .
}
GROUP BY ?class
ORDER BY DESC(?count)
LIMIT 30
`,
  },
  {
    id: "tpl-by-substance-iri",
    name: "Details of one specific substance",
    description: "Use when you have a known substance IRI — replaces the {{IRI}} placeholder.",
    keywords: ["one", "iri", "detail", "specific", "เดี่ยว"],
    source: "all",
    query: `${PREFIXES_SUB}
SELECT ?nameValue ?identifierValue
WHERE {
  <{{IRI}}> a idmp-sub:Substance ;
            idmp-sub:hasSubstanceName ?n ;
            cmns-id:isIdentifiedBy ?i .
  ?n idmp-sub:hasSubstanceNameValue ?nameValue .
  ?i cmns-txt:hasTextValue ?identifierValue .
}
`,
  },
];
