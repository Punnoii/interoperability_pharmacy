import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const { pathname } = req.nextUrl;

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/admin")) {
    try {
      const payload = jwtDecode<TokenPayload>(token);
      if (payload.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/homepage", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/homepage/:path*", "/admin/:path*"],
};
