import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// worked examples covering the query shapes we care about (SELECT / LIMIT / ASK / COUNT).
// few-shot beats a giant schema dump here, the model copies the property paths from these.
const FEW_SHOT_EXAMPLES: { question: string; sparql: string }[] = [
  // UC1-CQ9 / SELECT, chemical structure
  {
    question: "Describe the chemical structure of the substance ADENINE [USP MONOGRAPH].",
    sparql: `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>
PREFIX cmns-qtu: <https://www.omg.org/spec/Commons/QuantitiesAndUnits/>

SELECT ?smiles ?formula ?mw
WHERE {
  ?sub idmp-sub:hasSubstanceName/idmp-sub:hasSubstanceNameValue "ADENINE [USP MONOGRAPH]" .
  OPTIONAL { ?sub idmp-sub:hasDefiningStructure/idmp-sub:hasSMILES/idmp-sub:hasSMILESValue ?smiles }
  OPTIONAL { ?sub idmp-sub:hasDefiningMolecularFormula/cmns-txt:hasTextValue ?formula }
  OPTIONAL { ?sub idmp-sub:hasDefiningMolecularWeight/cmns-qtu:hasNumericValue ?mw }
}`,
  },
  // UC1-CQ3 / LIMIT, products by active moiety
  {
    question: "Give 5 products that contain substances with active moiety Apixaban [USAN].",
    sparql: `PREFIX idmp-mprd: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11615-MedicinalProducts/>
PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>
PREFIX cmns-rlcmp: <https://www.omg.org/spec/Commons/RolesAndCompositions/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>

SELECT DISTINCT ?product ?pname
WHERE {
  ?moiety idmp-sub:hasSubstanceName/idmp-sub:hasSubstanceNameValue "Apixaban [USAN]" .
  ?rel idmp-sub:hasRelatedSubstance ?moiety ;
       idmp-sub:hasSubjectSubstance ?sub ;
       cmns-dsg:isSignifiedBy/cmns-txt:hasTextValue "ACTIVE MOIETY" .
  ?ai cmns-rlcmp:isPlayedBy ?sub .
  ?comp idmp-mprd:hasActiveIngredient ?ai .
  ?product cmns-dsg:isDefinedIn ?comp ;
           cmns-dsg:hasName/idmp-mprd:hasFullMedicinalProductName ?pname
}
LIMIT 5`,
  },
  // UC1-CQ4-UNII / ASK, yes/no registration check
  {
    question: "Is a UNII registered for ROCCUS CHRYSOPS FLESH, COOKED?",
    sparql: `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX idmp-nara: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/NorthAmericanJurisdiction/NorthAmericanRegistrationAuthorities/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>

ASK
WHERE {
  ?code a idmp-nara:UniqueIngredientNumber ;
        cmns-id:identifies ?sub .
  ?sub idmp-sub:hasSubstanceName/idmp-sub:hasSubstanceNameValue "ROCCUS CHRYSOPS FLESH, COOKED"
}`,
  },
  // UC1-CQ2 / COUNT, number of active moieties
  {
    question: "How many active moieties does TESTOSTERONE UNDECANOATE have?",
    sparql: `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX cmns-dsg: <https://www.omg.org/spec/Commons/Designators/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>

SELECT (COUNT(DISTINCT ?moiety) AS ?count)
WHERE {
  ?sub idmp-sub:hasSubstanceName/idmp-sub:hasSubstanceNameValue "TESTOSTERONE UNDECANOATE" .
  ?rel idmp-sub:hasSubjectSubstance ?sub ;
       idmp-sub:hasRelatedSubstance ?moiety ;
       cmns-dsg:isSignifiedBy/cmns-txt:hasTextValue "ACTIVE MOIETY"
}`,
  },
  // UC1-CQ4 / SELECT, jurisdiction-specific code
  {
    question: "Which EudraVigilance (SMS) code does EUDISTEMON HUMIFUSUM WHOLE have?",
    sparql: `PREFIX idmp-sub: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/ISO11238-Substances/>
PREFIX idmp-eura: <https://spec.pistoiaalliance.org/idmp/ontology/ISO/EuropeanJurisdiction/EuropeanRegistrationAuthorities/>
PREFIX cmns-id: <https://www.omg.org/spec/Commons/Identifiers/>
PREFIX cmns-txt: <https://www.omg.org/spec/Commons/TextDatatype/>

SELECT ?val
WHERE {
  ?sub idmp-sub:hasSubstanceName/idmp-sub:hasSubstanceNameValue "EUDISTEMON HUMIFUSUM WHOLE" ;
       cmns-id:isIdentifiedBy ?code .
  ?code a idmp-eura:EudraVigilanceCode ;
        cmns-txt:hasTextValue ?val
}`,
  },
];

// one-liner role/domain framing that opens every prompt
const CONTEXT_HEADER =
  "You are a SPARQL query generator for a pharmaceutical knowledge graph\n" +
  "based on the IDMP (Identification of Medicinal Products) standard.";

// the chain-of-thought scaffold, walking these 5 steps keeps the smaller models from over-joining
const COT_STEPS = `=== INSTRUCTIONS ===
Think step by step. Write out your reasoning for EACH step below before the query:

Step 1 - What form does the answer take?
         yes/no question -> ASK
         build a graph -> CONSTRUCT
         anything else -> SELECT

Step 2 - What do I need to return?
         List the variables or values the question is asking for.

Step 3 - Which class do I start from?
         Pick the anchor class from the schema that matches the subject of the question.

Step 4 - How do I reach each value?
         Trace the property path from the anchor class to each return value.
         Every literal sits behind at least one intermediate node, do not skip it.

Step 5 - Are there any conditions?
         Exact match: "value"^^xsd:string
         Partial match: STRSTARTS / CONTAINS / UCASE
         Missing values: OPTIONAL
         Exclude: FILTER NOT EXISTS
         Aggregate: COUNT / GROUP BY / HAVING / ORDER BY / LIMIT`;

// tells the model to reason first, then emit the query after a lone "SPARQL:" line (extractSparql keys off that)
const COT_OUTPUT_FORMAT = `=== OUTPUT FORMAT ===
First write your step-by-step reasoning (Step 1 to Step 5).
Then, on its own line, write exactly:
SPARQL:
and after it output ONLY the raw SPARQL query (no markdown fences, starting with PREFIX or SELECT/ASK).`;

// assemble the full prompt: context + few-shot examples + CoT steps + output format + the actual question
function buildChainOfThoughtPrompt(nlQuery: string): string {
  const examples = FEW_SHOT_EXAMPLES
    .map((ex, i) => `# Example ${i + 1}\nQuestion: ${ex.question}\nSPARQL:\n${ex.sparql}`)
    .join("\n\n");

  return `${CONTEXT_HEADER}

=== EXAMPLES ===
${examples}

${COT_STEPS}

${COT_OUTPUT_FORMAT}

=== YOUR TASK ===
Question: ${nlQuery}`;
}

// the model reasons first and drops the query after a "SPARQL:" line, so slice from the last one.
// still tolerant of the old behaviour: strip ```fences``` or fall back to the first query keyword.
function extractSparql(text: string): string {
  const markerAt = text.toUpperCase().lastIndexOf("SPARQL:");
  const body = markerAt >= 0 ? text.slice(markerAt + "SPARQL:".length) : text;

  const fenceMatch = body.match(/```(?:sparql)?\n?([\s\S]+?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  const indices: number[] = [];
  for (const kw of ["PREFIX", "SELECT", "ASK", "CONSTRUCT", "DESCRIBE"]) {
    const idx = body.toUpperCase().indexOf(kw);
    if (idx >= 0) indices.push(idx);
  }
  if (indices.length > 0) {
    return body.slice(Math.min(...indices)).trim();
  }

  return body.trim();
}

// try these in order, first one that answers wins. 2.5-flash is deliberately not here,
// it 404s ("not available to new users") on freshly-made keys.
const MODEL_CHAIN = [
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
];

// single call to gemini's REST surface. it's a plain ?key= request, so this only works
// with a normal AIza key (not a service-account-bound one).
async function callGemini(apiKey: string, prompt: string, model: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // roomier cap than before, CoT reasoning eats tokens before the query even starts
        generationConfig: { temperature: 0.0, maxOutputTokens: 4096 },
      }),
    }
  );
}

// gemini path: walk MODEL_CHAIN, skip the ones that are rate-limited/overloaded and try
// the next, but fail fast on anything that's a real error (bad key, etc.).
async function generateWithGemini(prompt: string): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the server" }, { status: 500 });
  }

  let lastError = "";
  for (const model of MODEL_CHAIN) {
    const res = await callGemini(apiKey, prompt, model);

    // quota / overloaded, remember it and fall through to the next model
    if (res.status === 429 || res.status === 503) {
      lastError = `${model}: quota/rate-limit (${res.status})`;
      continue;
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
    return NextResponse.json({ sparql: extractSparql(rawText), reasoning: rawText, model });
  }

  // every model came back rate-limited
  return NextResponse.json(
    { error: `All models quota-exceeded. Last: ${lastError}` },
    { status: 429 }
  );
}

// ollama path: same job, but hitting the local container, free, no API key needed.
// 502 if ollama isn't reachable yet (it pulls the model on first use).
async function generateWithOllama(prompt: string): Promise<NextResponse> {
  const base = process.env.OLLAMA_URL || "http://ollama:11434";
  const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";

  let res: Response;
  try {
    res = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        // bumped for the CoT reasoning + query; num_ctx raised too so the long few-shot prompt + output
        // don't overflow ollama's default 4k window and get truncated
        options: { temperature: 0, num_predict: 4096, num_ctx: 8192 },
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: `Cannot reach Ollama at ${base}: ${String(e)}` }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json(
      { error: `Ollama error ${res.status}: ${errText.slice(0, 300)}` },
      { status: res.status }
    );
  }

  const data = await res.json() as { response?: string };
  const rawText = data.response ?? "";
  return NextResponse.json({ sparql: extractSparql(rawText), reasoning: rawText, model });
}

// POST /api/nlp, turn a natural-language question into SPARQL.
// must be logged in; then dispatch to whichever backend NLP_PROVIDER selects (gemini by default).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { query } = await req.json() as { query: string };

  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const prompt = buildChainOfThoughtPrompt(query.trim());
  const provider = (process.env.NLP_PROVIDER || "gemini").toLowerCase();

  // flip between the local model and the cloud one with a single env var
  if (provider === "ollama") {
    return generateWithOllama(prompt);
  }
  return generateWithGemini(prompt);
}
