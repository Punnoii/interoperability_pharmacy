import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "@/lib/auth";

// server-side current-user lookup: pull the auth cookie and verify it; null = not logged in
export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
