import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

export async function GET(req: NextRequest) {
  return proxyJson(req, "/api/profile/config", "GET");
}

export async function DELETE(req: NextRequest) {
  return proxyJson(req, "/api/profile/config", "DELETE");
}
