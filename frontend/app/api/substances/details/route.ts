import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iri = searchParams.get("iri");

  if (!iri) {
    return NextResponse.json({ error: "Missing iri parameter" }, { status: 400 });
  }

  const res = await fetch(
    `${backendUrl}${routes.substancesDetails}?iri=${encodeURIComponent(iri)}`
  );
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
