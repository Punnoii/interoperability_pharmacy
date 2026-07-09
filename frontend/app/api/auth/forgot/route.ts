import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { findByEmail } from "@/lib/users";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = (body?.email ?? "").toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const generic = {
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  };

  const user = await findByEmail(email);
  if (!user) {
    return NextResponse.json(generic);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({ data: { email, tokenHash, expiresAt } });

  const link = `${req.nextUrl.origin}/reset-password?token=${rawToken}`;

  try {
    const { sent } = await sendPasswordResetEmail(email, link);
    if (!sent && process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        devLink: link,
        message: "Email is not configured yet — use this link to reset (dev only).",
      });
    }
  } catch (e) {
    console.error("[forgot] failed to send reset email:", e);
  }

  return NextResponse.json(generic);
}
