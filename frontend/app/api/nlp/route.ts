import { NextRequest, NextResponse } from "next/server";

const DOMAIN_KNOWLEDGE = `You are an expert SPARQL query generator for the IDMP ISO 11238 Substances Ontology system.
Your task is to convert natural language (Thai or English) into a valid, executable SPARQL query.

[AVAILABLE PREFIXES - include ONLY what you use in the query body]
PREFIX :            <http://example.com/idmp-demo/>
PREFIX idmp-sub:    <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX idmp-dtp:    <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO21090-HarmonizedDatatypes/>
PREFIX cmns-id:     <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-dsg:    <https://www.omg.org/spec/Commons/Designators/>
PREFIX cmns-txt:    <https://www.omg.org/spec/Commons/TextDatatype/>
PREFIX lcc-639-1:   <https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/>
PREFIX rdf:         <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs:        <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd:         <http://www.w3.org/2001/XMLSchema#>

[PREFIX RULES]
- rdf: is ALWAYS required (every query uses rdf:type)
- Include a prefix ONLY if its namespace appears in the query body
- Do NOT include unused prefixes

[GOLDEN RULE: Always use 2-Hop Pattern]
NEVER connect literals directly to ?substance.
- Name search : ?substance idmp-sub:hasSubstanceName ?n . ?n idmp-sub:hasSubstanceNameValue ?name .
- Identifier  : ?substance cmns-id:isIdentifiedBy ?i  . ?i  cmns-txt:hasTextValue ?identifier .

[CLASSIFIER IRIs]
- Preferred Name : <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-PreferredName>
- Brand Name     : <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-BrandName>
- Synonym        : <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceNameClassifier-SynonymName>
- Chemical type  : <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/SubstanceTypeClassifier-Chemical>
- Language en    : <https://www.omg.org/spec/LCC/Languages/ISO639-1-LanguageCodes/en>

[SOURCE EXTRACTION]
BIND(REPLACE(STR(?substance), "^.*/substance/([a-z])/.*$", "$1") AS ?source)
Sources: a=Company A (PostgreSQL), b=Company B (PostgreSQL), c=Company C (MySQL),
         d=Company D (MongoDB), e=Company E (PostgreSQL raw)

[CASE-INSENSITIVE FILTER]
FILTER(CONTAINS(LCASE(?name), LCASE("search_term")))`;

function buildChainOfThoughtPrompt(nlQuery: string): string {
  return `${DOMAIN_KNOWLEDGE}

Generate a SPARQL query for: "${nlQuery}"

Think step by step:
1. What entities / classes are involved?
2. Are 2-Hop patterns actually needed here? If not, skip them.
3. What FILTER / BIND / classifiers are needed?
4. Include only prefixes that actually appear in the query body.
5. Does the result need ORDER BY or LIMIT?
6. Remove any triple pattern not used in SELECT or GROUP BY.

Then output the final SPARQL query.`;
}

function extractSparql(text: string): string {
  // Try ```sparql ... ``` or ``` ... ``` fence first
  const fenceMatch = text.match(/```(?:sparql)?\n?([\s\S]+?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  // Find earliest keyword: PREFIX / SELECT / ASK / CONSTRUCT / DESCRIBE
  const indices: number[] = [];
  for (const kw of ["PREFIX", "SELECT", "ASK", "CONSTRUCT", "DESCRIBE"]) {
    const idx = text.toUpperCase().indexOf(kw);
    if (idx >= 0) indices.push(idx);
  }
  if (indices.length > 0) {
    return text.slice(Math.min(...indices)).trim();
  }

  return text.trim();
}

// Model fallback chain — tries each model in order on 429/quota errors
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash",
];

async function callGemini(apiKey: string, prompt: string, model: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 2048 },
      }),
    }
  );
}

export async function POST(req: NextRequest) {
  const { query } = await req.json() as { query: string };

  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server" }, { status: 500 });
  }

  const prompt = buildChainOfThoughtPrompt(query.trim());

  let lastError = "";
  for (const model of MODEL_CHAIN) {
    const res = await callGemini(apiKey, prompt, model);

    if (res.status === 429 || res.status === 503) {
      lastError = `${model}: quota/rate-limit (${res.status})`;
      continue; // try next model
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Gemini API error ${res.status}: ${errText.slice(0, 300)}` },
        { status: res.status }
      );
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const sparql = extractSparql(rawText);

    return NextResponse.json({ sparql, reasoning: rawText, model });
  }

  return NextResponse.json(
    { error: `All models quota-exceeded. Last: ${lastError}` },
    { status: 429 }
  );
}
