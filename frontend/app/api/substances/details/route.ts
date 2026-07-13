import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

// full detail for one substance, keyed by its IRI. iri gets url-encoded since it's a full URI.
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
