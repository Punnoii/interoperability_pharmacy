import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "@/lib/auth";

/**
 * Read the auth_token cookie + verify JWT. Returns the token payload
 * (sub = user id) or null when unauthenticated / invalid.
 *
 * Use inside route handlers that need the current user:
 *   const session = await getSession();
 *   if (!session) return NextResponse.json({ error: "unauth" }, { status: 401 });
 *   // session.sub -> userId
 */
export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
