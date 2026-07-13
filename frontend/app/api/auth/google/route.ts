import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// start of the google oauth dance, build the consent url and redirect the user off to google
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/?error=google_not_configured", process.env.APP_URL || req.url));
  }

  const redirectUri = `${process.env.APP_URL || req.nextUrl.origin}/api/auth/google/callback`;
  const state = crypto.randomBytes(16).toString("hex"); // random nonce, stashed in a cookie below and re-checked on callback

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  res.cookies.set("g_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 min is plenty to bounce through google and come back
    path: "/",
  });
  return res;
}
