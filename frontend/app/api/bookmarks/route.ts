import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/bookmarks
 * List the current user's saved queries (newest first).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const bookmarks = await prisma.queryBookmark.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      query: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ bookmarks });
}

/**
 * POST /api/bookmarks
 * Body: { name: string; query: string; source?: string }
 * Create a new saved query for the current user.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { name?: unknown; query?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const source =
    typeof body.source === "string" && body.source.trim().length > 0
      ? body.source.trim()
      : "all";

  if (!name || !query) {
    return NextResponse.json(
      { error: "name and query are required" },
      { status: 400 },
    );
  }
  if (name.length > 120) {
    return NextResponse.json(
      { error: "name too long (max 120 chars)" },
      { status: 400 },
    );
  }
  if (query.length > 20_000) {
    return NextResponse.json(
      { error: "query too long (max 20,000 chars)" },
      { status: 400 },
    );
  }

  const bookmark = await prisma.queryBookmark.create({
    data: {
      userId: session.sub,
      name,
      query,
      source,
    },
    select: {
      id: true,
      name: true,
      query: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ bookmark }, { status: 201 });
}
