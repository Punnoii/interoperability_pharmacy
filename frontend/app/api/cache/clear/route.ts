import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl } = APP_CONFIG.api;

// thin proxy that forwards a cache-clear to the java backend and mirrors its response back
export async function DELETE() {
  const res = await fetch(`${backendUrl}/api/cache/clear`, { method: "DELETE" });
  const text = await res.text();
  // pass the body through untouched and preserve the upstream content-type (falls back to json)
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
