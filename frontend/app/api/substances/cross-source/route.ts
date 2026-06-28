import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get("identifier");

  if (!identifier) {
    return NextResponse.json({ error: "Missing identifier parameter" }, { status: 400 });
  }

  const res = await fetch(
    `${backendUrl}${routes.substancesCrossSource}?identifier=${encodeURIComponent(identifier)}`
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
