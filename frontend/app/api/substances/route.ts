import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

// GET /api/substances?search=...   or   GET /api/substances  (list all)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const backendPath = search
    ? `/api/substances/search?name=${encodeURIComponent(search)}`
    : `/api/substances`;

  const res = await fetch(`${BACKEND_URL}${backendPath}`);
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
