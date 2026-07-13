import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

// dumps the concept catalog the ELH index knows about — no params, so it's the pick-list for the compare UI.
// no-store since new concepts can show up as sandbox data changes.
export async function GET() {
  const res = await fetch(`${backendUrl}${routes.similarityConcepts}`, {
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
