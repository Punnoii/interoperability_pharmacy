import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl } = APP_CONFIG.api;

export async function DELETE() {
  const res = await fetch(`${backendUrl}/api/cache/clear`, { method: "DELETE" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
