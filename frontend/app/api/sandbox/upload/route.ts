import { NextRequest } from "next/server";
import { proxyMultipart } from "@/lib/proxyFetch";

export async function POST(req: NextRequest) {
  return proxyMultipart(req, "/api/sandbox/upload");
}
