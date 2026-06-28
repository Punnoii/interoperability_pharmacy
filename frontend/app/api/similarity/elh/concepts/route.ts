import { NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

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
