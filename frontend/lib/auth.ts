import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// jwt signing secret, from env in prod, falls back to a throwaway for local dev
const SECRET = process.env.JWT_SECRET ?? "rxvkg-dev-secret-change-in-production";

// bcrypt hash at cost 12, high enough to be slow for attackers, fine for login volume here
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// constant-time compare via bcrypt; hash carries its own salt so no separate arg
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

// mint a session token; default life is 7 days
export function signToken(payload: TokenPayload, expiresInSeconds: number = 60 * 60 * 24 * 7): string {
  return jwt.sign(payload, SECRET, { expiresIn: expiresInSeconds });
}

// verify + decode; any failure (bad sig, expired, malformed) collapses to null
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
