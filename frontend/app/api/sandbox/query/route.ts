import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

export async function POST(req: NextRequest) {
  return proxyJson(req, "/api/sandbox/query", "POST");
}
