import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

// score a single a/b concept pair. the /explain sibling gives the breakdown; this one's just the number.
export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${backendUrl}${routes.similarityPair}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
