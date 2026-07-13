import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { upsertOAuthUser } from "@/lib/users";

// google oauth callback — trade the auth code for tokens, upsert the user, set our own cookie
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const fwdHost = req.headers.get("x-forwarded-host");
  // behind the tailscale funnel url.origin is the internal host, so trust the forwarded headers for redirects
  const base = process.env.APP_URL || (fwdHost ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${fwdHost}` : url.origin);
  const fail = (e: string) => NextResponse.redirect(new URL(`/?error=${e}`, base));

  if (url.searchParams.get("error")) return fail("google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get("g_state")?.value;
  // csrf guard: the state we echoed to google must match the cookie we set on the way out
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

    // don't accept an unverified google email — someone could sign up with an address they don't own
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

    const res = NextResponse.redirect(new URL("/homepage", base));
    res.cookies.set("auth_token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure off in dev so http://localhost still keeps the cookie
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    res.cookies.set("g_state", "", { maxAge: 0, path: "/" }); // one-shot state, clear it now that we're done
    return res;
  } catch {
    return fail("google_error");
  }
}
