import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

// figure out the public-facing origin for redirects — behind a proxy (tailscale funnel) the real host is in x-forwarded-*, not req.origin
function externalBase(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  if (fwdHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${fwdHost}`;
  }
  if (process.env.APP_URL) return process.env.APP_URL;
  return req.nextUrl.origin;
}

// gate the protected routes below: no cookie -> login; /admin additionally needs the ADMIN role.
// note we only decode the jwt here (edge runtime can't verify) — real verification happens server-side; this just steers navigation
export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const { pathname } = req.nextUrl;
  const base = externalBase(req);

  if (!token) {
    return NextResponse.redirect(new URL("/", base));
  }

  if (pathname.startsWith("/admin")) {
    try {
      const payload = jwtDecode<TokenPayload>(token);
      if (payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/homepage", base));
      }
    } catch {
      // unparseable token — treat as logged out
      return NextResponse.redirect(new URL("/", base));
    }
  }

  return NextResponse.next();
}

// only run the middleware on these logged-in areas; everything else (landing, /api, assets) skips it
export const config = {
  matcher: ["/homepage/:path*", "/admin/:path*", "/profile/:path*", "/history/:path*"],
};
