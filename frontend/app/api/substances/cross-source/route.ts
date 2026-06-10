import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

// GET /api/substances/cross-source?identifier=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get("identifier");

  if (!identifier) {
    return NextResponse.json({ error: "Missing identifier parameter" }, { status: 400 });
  }

  const res = await fetch(
    `${BACKEND_URL}/api/substances/cross-source?identifier=${encodeURIComponent(identifier)}`
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
