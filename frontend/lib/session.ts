import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "@/lib/auth";

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
