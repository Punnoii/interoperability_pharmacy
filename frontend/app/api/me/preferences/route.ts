import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// read the user's ui prefs (just the dark-mode flag for now)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { darkMode: true },
  });

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  return NextResponse.json({ darkMode: user.darkMode });
}

// persist a pref change so dark mode follows the user across devices, not just localStorage
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { darkMode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  // only accept a real boolean, ignore anything else so a bad payload can't null the column
  const data: { darkMode?: boolean } = {};
  if (typeof body.darkMode === "boolean") {
    data.darkMode = body.darkMode;
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
    select: { darkMode: true },
  });

  return NextResponse.json({ darkMode: user.darkMode });
}
