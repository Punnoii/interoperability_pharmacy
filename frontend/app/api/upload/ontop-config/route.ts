import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082";

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const upstream = new FormData();
  for (const [name, value] of form.entries()) {
    upstream.append(name, value);
  }

  const res = await fetch(`${BACKEND_URL}/api/upload/ontop-config`, {
    method: "POST",
    body: upstream,
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
