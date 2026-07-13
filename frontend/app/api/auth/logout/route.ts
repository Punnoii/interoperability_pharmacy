import { NextResponse } from "next/server";

// logout, nothing server-side to tear down (stateless jwt), just expire the cookie
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", "", { maxAge: 0, path: "/" }); // maxAge 0 tells the browser to drop it immediately
  return res;
}
