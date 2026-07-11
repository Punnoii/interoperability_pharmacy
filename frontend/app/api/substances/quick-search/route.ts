import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const limit = searchParams.get("limit") || "8";

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(
      `${backendUrl}${routes.substancesQuickSearchBackend}?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json([]);
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
