import { NextRequest, NextResponse } from "next/server";
import { proxyMultipart } from "@/lib/proxyFetch";
import { getSession } from "@/lib/session";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Upload too large (max 25 MB)" }, { status: 413 });
  }

  return proxyMultipart(req, "/api/sandbox/upload");
}
