import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

// is the user's sandbox loaded/ready? proxyJson forwards the cookie so the backend knows whose sandbox.
export async function GET(req: NextRequest) {
  return proxyJson(req, "/api/sandbox/status", "GET");
}

// tear down the whole sandbox. note the path drops /status — it's the sandbox root, not the status resource.
export async function DELETE(req: NextRequest) {
  return proxyJson(req, "/api/sandbox", "DELETE");
}
