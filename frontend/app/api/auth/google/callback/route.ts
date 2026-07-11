import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { upsertOAuthUser } from "@/lib/users";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const fail = (e: string) => NextResponse.redirect(new URL(`/?error=${e}`, req.url));

  if (url.searchParams.get("error")) return fail("google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get("g_state")?.value;
  if (!code || !state || !savedState || state !== savedState) return fail("google_state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google_not_configured");

  const redirectUri = `${process.env.APP_URL || url.origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("google_token");
    const tokens = await tokenRes.json();

    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail("google_userinfo");
    const info = await infoRes.json();

    const email: string | undefined = info.email;
    if (!email || info.email_verified === false) return fail("google_email");

    const username: string = info.name || email.split("@")[0];
    const user = await upsertOAuthUser(email, username);

    const jwt = signToken({
      sub: user.id,
      email: user.email ?? "",
      username: user.username ?? "",
      role: user.role,
    });

    const res = NextResponse.redirect(new URL("/homepage", req.url));
    res.cookies.set("auth_token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    res.cookies.set("g_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch {
    return fail("google_error");
  }
}
