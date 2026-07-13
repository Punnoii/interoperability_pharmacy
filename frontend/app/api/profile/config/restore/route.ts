import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

// restore the default profile config, just forwards to the java backend (auth/cookies handled in proxyJson)
export async function POST(req: NextRequest) {
  return proxyJson(req, "/api/profile/config/restore", "POST");
}
