import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

// typeahead for the search box, kept deliberately forgiving so a flaky backend never breaks the UI.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const limit = searchParams.get("limit") || "8";

  // ignore single-char / empty queries, they'd match everything
  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  try {
    const res = await fetch(
      `${backendUrl}${routes.substancesQuickSearchBackend}?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
      { cache: "no-store" },
    );
    // any upstream hiccup just yields an empty list rather than a visible error
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
