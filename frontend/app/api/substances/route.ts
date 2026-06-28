import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";

const { backendUrl, routes } = APP_CONFIG.api;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const backendPath = search
    ? `${routes.substances}/search?name=${encodeURIComponent(search)}`
    : routes.substances;

  const res = await fetch(`${backendUrl}${backendPath}`);
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}
