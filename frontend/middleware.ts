import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

function externalBase(req: NextRequest): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  if (fwdHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${fwdHost}`;
  }
  if (process.env.APP_URL) return process.env.APP_URL;
  return req.nextUrl.origin;
}

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
      return NextResponse.redirect(new URL("/", base));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/homepage/:path*", "/admin/:path*", "/profile/:path*", "/history/:path*"],
};
