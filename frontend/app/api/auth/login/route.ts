import { NextRequest, NextResponse } from "next/server";
import { findByEmail } from "@/lib/users";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email: string = body?.email ?? "";
  const password: string = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await findByEmail(email);
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const remember = body?.remember === true;
  const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;
  const SESSION_TOKEN_TTL = 60 * 60 * 24 * 7;

  const token = signToken(
    {
      sub: user.id,
      email: user.email ?? "",
      username: user.username ?? "",
      role: user.role,
    },
    remember ? REMEMBER_MAX_AGE : SESSION_TOKEN_TTL,
  );

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  });
  res.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });
  return res;
}
