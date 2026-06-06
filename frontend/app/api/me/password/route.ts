import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";

/**
 * PATCH /api/me/password
 * Body: { currentPassword: string; newPassword: string }
 * Change the current user's password. Requires the current password to
 * confirm the request actually comes from the account owner.
 */
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

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

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
