import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

// run a SPARQL query against the user's sandbox graph. body + cookie forwarded; backend validates and scopes it.
export async function POST(req: NextRequest) {
  return proxyJson(req, "/api/sandbox/query", "POST");
}
