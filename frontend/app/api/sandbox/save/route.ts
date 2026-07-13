import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

// persist the current sandbox state server-side; auth is enforced by the backend off the forwarded cookie.
export async function POST(req: NextRequest) {
  return proxyJson(req, "/api/sandbox/save", "POST");
}
