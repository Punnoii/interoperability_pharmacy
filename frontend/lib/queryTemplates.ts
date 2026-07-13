// canned SPARQL the query UI offers; each template carries its own params + est. runtime.
// nothing here executes — it's the catalog the runner reads and token-substitutes into.
export type SourceKey = "all" | "a" | "b" | "c" | "d" | "e";

export type TemplateCategory =
  | "explore"
  | "substance"
  | "codes"
  | "chemistry"
  | "product"
  | "crosssource"
  | "tmt";

export interface TemplateParam {
  token: string;
  label: string;
  kind: "substance" | "text";
  placeholder: string;
  defaultValue: string;
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  source: SourceKey;
  query: string;
  category?: TemplateCategory;
  params?: TemplateParam[];
  estSeconds?: number;
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  explore: "Explore the graph",
  substance: "Substance lookup",
  codes: "Identifiers & codes",
  chemistry: "Chemistry",
  product: "Products & packaging",
  crosssource: "Cross-source",
  tmt: "Thai medicines (TMT)",
};

export const CATEGORY_ORDER: TemplateCategory[] = [
  "explore",
  "substance",
  "codes",
  "chemistry",
  "product",
  "crosssource",
  "tmt",
];

// shared PREFIX header prepended to every query below via ${P} — keeps each template readable
const P = `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX idmp-mprd: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/>
PREFIX idmp-dtp: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO21090-HarmonizedDatatypes/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
PREFIX cmns-col: <https://www.omg.org/spec/Commons/Collections/>
PREFIX cmns-qtu: <https://www.omg.org/spec/Commons/QuantitiesAndUnits/>
PREFIX cmns-rlcmp: <https://www.omg.org/spec/Commons/RolesAndCompositions/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

// reusable param defs — the runner swaps each `token` in the query text for the user's pick.
// SUBSTANCE_PARAM is an autocomplete-backed IRI; the rest are plain text codes/names.
const SUBSTANCE_PARAM: TemplateParam = {
  token: "{{IRI}}",
  label: "Substance",
  kind: "substance",
  placeholder: "Search a substance by name…",
  defaultValue: "http://example.com/idmp-demo/gsrs/substance/0103a288-6eb6-4ced-b13a-849cd7edf028",
};

const NAME_PARAM: TemplateParam = {
  token: "{{NAME}}",
  label: "Substance name",
  kind: "text",
  placeholder: "amoxicillin",
  defaultValue: "amoxicillin",
};

const PRODUCT_PARAM: TemplateParam = {
  token: "{{PRODUCT}}",
  label: "Product name contains",
  kind: "text",
  placeholder: "advil",
  defaultValue: "advil",
};

const NDC_PARAM: TemplateParam = {
  token: "{{NDC}}",
  label: "NDC product code",
  kind: "text",
  placeholder: "0573-0164",
  defaultValue: "0573-0164",
};

const ATC_PARAM: TemplateParam = {
  token: "{{ATC}}",
  label: "ATC code",
  kind: "text",
  placeholder: "M01AE01",
  defaultValue: "M01AE01",
};

// the catalog itself, grouped loosely by category (explore -> substance -> codes -> ... -> tmt)
export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    id: "tpl-count-substances",
    name: "Count all substances",
    description: "How many distinct substances exist across GSRS + FDA.",
    keywords: ["count", "total", "นับ", "สาร", "summary", "stats", "how many"],
    source: "all",
    category: "explore",
    estSeconds: 9,
    query: `${P}
SELECT (COUNT(DISTINCT ?substance) AS ?totalSubstances)
WHERE {
  ?substance a idmp-sub:Substance .
}
`,
  },
  {
    id: "tpl-count-products",
    name: "Count all medicinal products",
    description: "How many FDA NDC medicinal products are in the graph.",
    keywords: ["count", "product", "drug", "ยา", "total", "นับ", "fda", "ndc"],
    source: "all",
    category: "explore",
    estSeconds: 1,
    query: `${P}
SELECT (COUNT(DISTINCT ?product) AS ?totalProducts)
WHERE {
  ?product a idmp-mprd:MedicinalProduct .
}
`,
  },
  {
    id: "tpl-graph-summary",
    name: "Graph summary — substances vs products",
    description: "One row: total substances and total medicinal products side by side.",
    keywords: ["summary", "overview", "stats", "สรุป", "count", "both"],
    source: "all",
    category: "explore",
    estSeconds: 10,
    query: `${P}
SELECT (COUNT(DISTINCT ?s) AS ?substances) (COUNT(DISTINCT ?p) AS ?products)
WHERE {
  { ?s a idmp-sub:Substance . }
  UNION
  { ?p a idmp-mprd:MedicinalProduct . }
}
`,
  },
  {
    id: "tpl-code-systems",
    name: "Which code systems are available?",
    description: "List every coding system (WHO-ATC, CAS, PUBCHEM, …) that substances are coded in.",
    keywords: ["code system", "atc", "cas", "pubchem", "vocabulary", "ระบบรหัส", "sources"],
    source: "all",
    category: "explore",
    estSeconds: 5,
    query: `${P}
SELECT DISTINCT ?codeSystem
WHERE {
  ?cs a idmp-dtp:CodeSystem ;
      cmns-dsg:hasName ?csn .
  ?csn cmns-txt:hasTextValue ?codeSystem .
}
ORDER BY ?codeSystem
LIMIT 60
`,
  },
  {
    id: "tpl-peek-products",
    name: "Peek — 100 medicinal products",
    description: "Fast sample of FDA products with their NDC code. Good first query.",
    keywords: ["peek", "sample", "first", "preview", "ดู", "product", "ยา", "list"],
    source: "all",
    category: "explore",
    estSeconds: 1,
    query: `${P}
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
    id: "tpl-substance-search-name",
    name: "Search substances by name",
    description: "Find substance IRIs whose name contains your keyword. Click a row to enrich it with Wikidata.",
    keywords: ["search", "find", "name", "ค้นหา", "ชื่อ", "contains", "keyword", "lookup"],
    source: "all",
    category: "substance",
    estSeconds: 25,
    params: [NAME_PARAM],
    query: `${P}
SELECT DISTINCT ?substance ?name
WHERE {
  ?substance idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?name .
  FILTER(CONTAINS(LCASE(?name), LCASE("{{NAME}}")))
}
LIMIT 50
`,
  },
  {
    id: "tpl-substance-synonyms",
    name: "All names & synonyms of one substance",
    description: "Every recorded name variant (systematic, brand, code names) for a substance.",
    keywords: ["synonym", "names", "ชื่อพ้อง", "alias", "variants", "brand"],
    source: "all",
    category: "substance",
    estSeconds: 11,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?name
WHERE {
  <{{IRI}}> idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?name .
}
ORDER BY ?name
LIMIT 60
`,
  },
  {
    id: "tpl-substance-relationships",
    name: "Related substances (impurity, salt, parent)",
    description: "Substances linked to this one, with the relationship type from GSRS.",
    keywords: ["relationship", "related", "impurity", "salt", "parent", "moiety", "ความสัมพันธ์"],
    source: "all",
    category: "substance",
    estSeconds: 22,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?relationshipType ?relatedSubstance
WHERE {
  ?rel idmp-sub:hasSubjectSubstance <{{IRI}}> ;
       idmp-sub:hasRelatedSubstance ?relatedSubstance ;
       cmns-dsg:isSignifiedBy ?rc .
  ?rc cmns-txt:hasTextValue ?relationshipType .
}
LIMIT 40
`,
  },
  {
    id: "tpl-substances-most-synonyms",
    name: "Substances with the most synonyms",
    description: "Which substances carry the largest number of name variants.",
    keywords: ["synonym", "most", "many", "หลาย", "ranking", "top"],
    source: "all",
    category: "substance",
    estSeconds: 25,
    query: `${P}
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
    id: "tpl-substance-all-codes",
    name: "All identifiers of one substance",
    description: "Every code for a substance across all systems — UNII, CAS, ATC, PubChem, ChEMBL…",
    keywords: ["identifier", "code", "unii", "cas", "pubchem", "chembl", "รหัส", "all codes"],
    source: "all",
    category: "codes",
    estSeconds: 14,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?codeSystem ?code
WHERE {
  <{{IRI}}> cmns-id:isIdentifiedBy ?c .
  ?c cmns-txt:hasTextValue ?code ;
     cmns-col:isMemberOf ?cs .
  ?cs cmns-dsg:hasName ?csn .
  ?csn cmns-txt:hasTextValue ?codeSystem .
}
ORDER BY ?codeSystem
LIMIT 60
`,
  },
  {
    id: "tpl-substance-atc",
    name: "ATC codes of one substance",
    description: "WHO ATC classification codes for a substance (the query behind the UNII bug fix).",
    keywords: ["atc", "who", "classification", "รหัส atc", "therapeutic"],
    source: "all",
    category: "codes",
    estSeconds: 16,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?atcCode
WHERE {
  <{{IRI}}> cmns-id:isIdentifiedBy ?c .
  ?c cmns-txt:hasTextValue ?atcCode ;
     cmns-col:isMemberOf ?cs .
  ?cs cmns-dsg:hasName ?csn .
  ?csn cmns-txt:hasTextValue "WHO-ATC"^^xsd:string .
  FILTER(REGEX(?atcCode, "^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$"))
}
ORDER BY ?atcCode
`,
  },
  {
    id: "tpl-substance-by-atc",
    name: "Reverse lookup — which substance has this ATC code?",
    description: "Start from a WHO ATC code and find the substance it classifies.",
    keywords: ["reverse", "atc", "lookup", "ย้อนกลับ", "which substance", "by code"],
    source: "all",
    category: "codes",
    estSeconds: 20,
    params: [ATC_PARAM],
    query: `${P}
SELECT DISTINCT ?substance ?name
WHERE {
  ?c cmns-txt:hasTextValue "{{ATC}}"^^xsd:string ;
     cmns-col:isMemberOf ?cs ;
     cmns-id:identifies ?substance .
  ?cs cmns-dsg:hasName ?csn .
  ?csn cmns-txt:hasTextValue "WHO-ATC"^^xsd:string .
  ?substance idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?name .
}
LIMIT 30
`,
  },

  {
    id: "tpl-substance-chemistry",
    name: "Chemistry — formula, weight, SMILES",
    description: "Molecular formula, molecular weight and SMILES string of a substance.",
    keywords: ["chemistry", "formula", "weight", "smiles", "molecular", "เคมี", "โครงสร้าง"],
    source: "all",
    category: "chemistry",
    estSeconds: 4,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?formula ?molecularWeight ?smiles
WHERE {
  OPTIONAL {
    <{{IRI}}> idmp-sub:hasDefiningMolecularFormula ?mf .
    ?mf cmns-txt:hasTextValue ?formula .
  }
  OPTIONAL {
    <{{IRI}}> idmp-sub:hasDefiningMolecularWeight ?mw .
    ?mw cmns-qtu:hasNumericValue ?molecularWeight .
  }
  OPTIONAL {
    <{{IRI}}> idmp-sub:hasDefiningStructure ?ms .
    ?ms idmp-sub:hasSMILES ?sm .
    ?sm idmp-sub:hasSMILESValue ?smiles .
  }
}
`,
  },

  {
    id: "tpl-product-search",
    name: "Search products by name",
    description: "Find FDA medicinal products whose name contains your keyword.",
    keywords: ["product", "drug", "search", "brand", "ยา", "ค้นหา", "name"],
    source: "all",
    category: "product",
    estSeconds: 1,
    params: [PRODUCT_PARAM],
    query: `${P}
SELECT ?product ?productName ?ndcCode
WHERE {
  ?product cmns-dsg:hasName ?pn ;
           cmns-id:isIdentifiedBy ?pid .
  ?pn idmp-mprd:hasFullMedicinalProductName ?productName .
  ?pid cmns-txt:hasTextValue ?ndcCode .
  FILTER(CONTAINS(LCASE(?productName), LCASE("{{PRODUCT}}")))
}
LIMIT 40
`,
  },
  {
    id: "tpl-product-ingredients",
    name: "Active ingredients of one product (by NDC)",
    description: "Given an NDC product code, list its active ingredients.",
    keywords: ["ingredient", "active", "ส่วนผสม", "ndc", "composition", "what is in"],
    source: "all",
    category: "product",
    estSeconds: 13,
    params: [NDC_PARAM],
    query: `${P}
SELECT DISTINCT ?ingredientName
WHERE {
  ?product cmns-id:isIdentifiedBy ?pid .
  ?pid cmns-txt:hasTextValue "{{NDC}}"^^xsd:string .
  ?product cmns-dsg:isDefinedIn ?comp .
  ?comp idmp-mprd:hasActiveIngredient ?ai .
  ?ai cmns-rlcmp:isPlayedBy ?substance .
  ?substance idmp-sub:hasSubstanceName ?sn .
  ?sn idmp-sub:hasSubstanceNameValue ?ingredientName .
}
LIMIT 30
`,
  },
  {
    id: "tpl-product-packages",
    name: "Packaging of one product (by NDC)",
    description: "Package variants (box, blister, bottle) and their package NDC codes.",
    keywords: ["package", "packaging", "บรรจุภัณฑ์", "box", "bottle", "ndc"],
    source: "all",
    category: "product",
    estSeconds: 2,
    params: [NDC_PARAM],
    query: `${P}
SELECT ?packageCode ?packageDescription
WHERE {
  ?product cmns-id:isIdentifiedBy ?pid .
  ?pid cmns-txt:hasTextValue "{{NDC}}"^^xsd:string .
  ?pkg cmns-dsg:isDefinedIn ?product ;
       cmns-dsg:hasDescription ?packageDescription ;
       cmns-id:isIdentifiedBy ?pcid .
  ?pcid cmns-txt:hasTextValue ?packageCode .
}
LIMIT 30
`,
  },
  {
    id: "tpl-packages-all",
    name: "Peek — 50 drug packages",
    description: "Sample of packaged products with package NDC and description.",
    keywords: ["package", "peek", "sample", "บรรจุภัณฑ์", "list"],
    source: "all",
    category: "product",
    estSeconds: 2,
    query: `${P}
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
    id: "tpl-substance-products",
    name: "Which products contain this substance?",
    description: "FDA products whose active ingredient is the given substance — the GSRS ↔ FDA join.",
    keywords: ["product", "contains", "ingredient", "ผลิตภัณฑ์", "which drugs", "cross"],
    source: "all",
    category: "crosssource",
    estSeconds: 6,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?productName ?ndcCode
WHERE {
  ?product cmns-dsg:isDefinedIn ?comp ;
           cmns-dsg:hasName ?pn ;
           cmns-id:isIdentifiedBy ?pid .
  ?comp idmp-mprd:hasActiveIngredient ?ai .
  ?ai cmns-rlcmp:isPlayedBy <{{IRI}}> .
  ?pn idmp-mprd:hasFullMedicinalProductName ?productName .
  ?pid cmns-txt:hasTextValue ?ndcCode .
}
LIMIT 40
`,
  },
  {
    id: "tpl-unmatched-ingredients",
    name: "Data quality — ingredients not matched to GSRS",
    description: "FDA ingredients matched only to an OpenFDA substance, not to a GSRS substance.",
    keywords: ["quality", "unmatched", "missing", "คุณภาพ", "gap", "coverage", "data"],
    source: "all",
    category: "crosssource",
    estSeconds: 24,
    query: `${P}
SELECT DISTINCT ?productName ?ingredientName
WHERE {
  ?product cmns-dsg:isDefinedIn ?comp ;
           cmns-dsg:hasName ?pn .
  ?pn idmp-mprd:hasFullMedicinalProductName ?productName .
  ?comp idmp-mprd:hasActiveIngredient ?ai .
  ?ai cmns-rlcmp:isPlayedBy ?ofs .
  ?ofs idmp-sub:hasSubstanceName ?sn .
  ?sn idmp-sub:hasSubstanceNameValue ?ingredientName .
  FILTER(STRSTARTS(STR(?ofs), "http://example.com/idmp-demo/fda/substance/"))
  FILTER NOT EXISTS {
    ?ai cmns-rlcmp:isPlayedBy ?g .
    FILTER(STRSTARTS(STR(?g), "http://example.com/idmp-demo/gsrs/substance/"))
  }
}
LIMIT 40
`,
  },
  {
    id: "tpl-substance-full-profile",
    name: "Full profile of one substance",
    description: "Chemistry, synonym count and every ATC code — one row, the flagship cross-source lookup.",
    keywords: ["profile", "everything", "full", "ทั้งหมด", "overview", "summary", "cross"],
    source: "all",
    category: "crosssource",
    estSeconds: 16,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT
  (SAMPLE(?formula) AS ?molecularFormula)
  (SAMPLE(?mw) AS ?molecularWeight)
  (COUNT(DISTINCT ?name) AS ?nameCount)
  (GROUP_CONCAT(DISTINCT ?atcCode; SEPARATOR=", ") AS ?atcCodes)
WHERE {
  <{{IRI}}> idmp-sub:hasSubstanceName ?n .
  ?n idmp-sub:hasSubstanceNameValue ?name .
  OPTIONAL {
    <{{IRI}}> idmp-sub:hasDefiningMolecularFormula ?mf .
    ?mf cmns-txt:hasTextValue ?formula .
  }
  OPTIONAL {
    <{{IRI}}> idmp-sub:hasDefiningMolecularWeight ?mwn .
    ?mwn cmns-qtu:hasNumericValue ?mw .
  }
  OPTIONAL {
    <{{IRI}}> cmns-id:isIdentifiedBy ?c .
    ?c cmns-txt:hasTextValue ?atcCode ;
       cmns-col:isMemberOf ?cs .
    ?cs cmns-dsg:hasName ?csn .
    ?csn cmns-txt:hasTextValue "WHO-ATC"^^xsd:string .
    FILTER(REGEX(?atcCode, "^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$"))
  }
}
`,
  },

  {
    id: "tpl-tmt-products-by-substance",
    name: "Thai TMT products containing a substance",
    description: "Thai medicines (TMT) whose active ingredient links to this GSRS substance — Thai ↔ GSRS cross-source.",
    keywords: ["tmt", "thai", "ไทย", "ยาไทย", "product", "brand", "trade"],
    source: "all",
    category: "tmt",
    estSeconds: 8,
    params: [SUBSTANCE_PARAM],
    query: `${P}
SELECT DISTINCT ?tmtProduct ?tpuCode
WHERE {
  ?product idmp-mprd:hasActiveIngredient ?ai ;
           cmns-dsg:hasName ?pn ;
           cmns-id:isIdentifiedBy ?id .
  ?ai cmns-rlcmp:isPlayedBy <{{IRI}}> .
  ?pn idmp-mprd:hasFullMedicinalProductName ?tmtProduct .
  ?id cmns-txt:hasTextValue ?tpuCode .
  FILTER(STRSTARTS(STR(?product), "http://example.com/idmp-demo/tmt/product/"))
}
LIMIT 40
`,
  },
  {
    id: "tpl-tmt-product-search",
    name: "Search Thai TMT products by name",
    description: "Find Thai medicines (TMT) whose name contains your keyword, with the TPU code.",
    keywords: ["tmt", "thai", "ไทย", "ยาไทย", "search", "ค้นหา", "tpu", "trade"],
    source: "all",
    category: "tmt",
    estSeconds: 4,
    params: [{
      token: "{{TMT}}",
      label: "Thai product name contains",
      kind: "text",
      placeholder: "paracetamol",
      defaultValue: "paracetamol",
    }],
    query: `${P}
SELECT DISTINCT ?product ?productName ?tpuCode
WHERE {
  ?product cmns-dsg:hasName ?pn ;
           cmns-id:isIdentifiedBy ?id ;
           cmns-dsg:hasDescription ?fsn .
  ?pn idmp-mprd:hasFullMedicinalProductName ?productName .
  ?id cmns-txt:hasTextValue ?tpuCode .
  FILTER(STRSTARTS(STR(?product), "http://example.com/idmp-demo/tmt/product/"))
  FILTER(CONTAINS(LCASE(?fsn), LCASE("{{TMT}}")))
}
LIMIT 40
`,
  },
];
