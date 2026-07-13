import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/users";
import { signToken } from "@/lib/auth";

// self-serve signup — creates the user and logs them straight in with the auth cookie
export async function POST(req: NextRequest) {
  // registration is off by default; flip ALLOW_REGISTRATION to open it up (this is a mostly-private deploy)
  if (process.env.ALLOW_REGISTRATION !== "true") {
    return NextResponse.json({ error: "Registration is disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const username: string = body?.username ?? "";
  const email: string = body?.email ?? "";
  const password: string = body?.password ?? "";

  if (!username || !email || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    const user = await createUser(username, email, password);
    const token = signToken({
      sub: user.id,
      email: user.email ?? "",
      username: user.username ?? "",
      role: user.role,
    });

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (err: unknown) {
    // createUser throws on things like a duplicate email — surface that message as a 400
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
