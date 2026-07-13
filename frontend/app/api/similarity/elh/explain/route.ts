import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

// explains why two concepts (a, b) score the way they do under the ELH similarity measure.
// rebuild the query via URL so the two IRIs get encoded safely rather than string-concatenated.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const a = searchParams.get("a") ?? "";
  const b = searchParams.get("b") ?? "";

  const url = new URL(`${backendUrl}${routes.similarityExplain}`);
  url.searchParams.set("a", a);
  url.searchParams.set("b", b);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
