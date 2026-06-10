import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

// GET /api/substances/details?iri=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iri = searchParams.get("iri");

  if (!iri) {
    return NextResponse.json({ error: "Missing iri parameter" }, { status: 400 });
  }

  const res = await fetch(
    `${BACKEND_URL}/api/substances/details?iri=${encodeURIComponent(iri)}`
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
