import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ stagingId: string }> }
) {
  const { stagingId } = await ctx.params;
  const body = await req.json();

  const res = await fetch(
    `${BACKEND_URL}/api/upload/ontop-config/${stagingId}/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") || "application/sparql-results+json",
      "X-Staging-Id": stagingId,
    },
  });
}
