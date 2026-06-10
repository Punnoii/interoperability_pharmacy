import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

async function authorize(id: string) {
  const session = await getSession();
  if (!session) {
    return {
      err: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }
  if (!id) {
    return { err: NextResponse.json({ error: "missing id" }, { status: 400 }) };
  }
  const existing = await prisma.queryBookmark.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!existing) {
    return { err: NextResponse.json({ error: "not found" }, { status: 404 }) };
  }
  if (existing.userId !== session.sub) {
    return { err: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("err" in auth) return auth.err;

  let body: { name?: unknown; query?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const data: { name?: string; query?: string; source?: string } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json(
        { error: "name too long (max 120 chars)" },
        { status: 400 },
      );
    }
    data.name = name;
  }
  if (typeof body.query === "string") {
    const query = body.query.trim();
    if (!query) {
      return NextResponse.json({ error: "query cannot be empty" }, { status: 400 });
    }
    if (query.length > 20_000) {
      return NextResponse.json(
        { error: "query too long (max 20,000 chars)" },
        { status: 400 },
      );
    }
    data.query = query;
  }
  if (typeof body.source === "string" && body.source.trim().length > 0) {
    data.source = body.source.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "no updatable fields supplied" },
      { status: 400 },
    );
  }

  const bookmark = await prisma.queryBookmark.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      query: true,
      source: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ bookmark });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorize(id);
  if ("err" in auth) return auth.err;

  await prisma.queryBookmark.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
