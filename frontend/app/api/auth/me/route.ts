import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { findById } from "@/lib/users";

// who-am-i for the client. reads the cookie's jwt, then re-fetches the user so
// the response reflects the current db row rather than whatever was baked into the token
export async function GET(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const user = await findById(payload.sub);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  });
}
