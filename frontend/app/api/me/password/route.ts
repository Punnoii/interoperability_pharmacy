import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";

// change your own password. requires the current one, so a hijacked session alone can't lock you out
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!current || !next) {
    return NextResponse.json(
      { error: "currentPassword and newPassword are required" },
      { status: 400 },
    );
  }
  if (next.length < 8) {
    return NextResponse.json(
      { error: "new password must be at least 8 characters" },
      { status: 400 },
    );
  }
  if (next === current) {
    return NextResponse.json(
      { error: "new password must differ from current password" },
      { status: 400 },
    );
  }

  // no local hash means an oauth-only account, there's no password to change here
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // confirm they actually know the current password before we overwrite it
  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "current password is incorrect" },
      { status: 403 },
    );
  }

  const passwordHash = await hashPassword(next);
  await prisma.user.update({
    where: { id: session.sub },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
