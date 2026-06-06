import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/me
 * Return the current user's profile + counts used on the Profile page.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      darkMode: true,
      createdAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const bookmarkCount = await prisma.queryBookmark.count({
    where: { userId: session.sub },
  });

  return NextResponse.json({
    user,
    stats: {
      totalSavedQueries: bookmarkCount,
    },
  });
}

/**
 * PATCH /api/me
 * Body: { username?: string }
 * Update the current user's display name.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { username?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const data: { username?: string } = {};
  if (typeof body.username === "string") {
    const next = body.username.trim();
    if (!next) {
      return NextResponse.json({ error: "username cannot be empty" }, { status: 400 });
    }
    if (next.length > 64) {
      return NextResponse.json(
        { error: "username too long (max 64 chars)" },
        { status: 400 },
      );
    }
    data.username = next;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "no updatable fields supplied" },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.sub },
    data,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      darkMode: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
