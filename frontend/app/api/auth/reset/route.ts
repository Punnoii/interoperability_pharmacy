import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { updatePasswordByEmail } from "@/lib/users";

// completes a password reset using the token from the emailed link
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token: string = body?.token ?? "";
  const password: string = body?.password ?? "";

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // we only stored the hash, so hash the incoming token the same way to look it up
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  // reject if unknown, already spent, or past its 1h expiry — tokens are strictly single-use
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 }
    );
  }

  await updatePasswordByEmail(record.email, password);
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }); // burn the token so the link can't be replayed

  return NextResponse.json({ ok: true, message: "Password updated. You can now sign in." });
}
