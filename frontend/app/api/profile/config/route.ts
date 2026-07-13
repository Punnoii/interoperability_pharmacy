import { NextRequest } from "next/server";
import { proxyJson } from "@/lib/proxyFetch";

// fetch the current profile config from the backend
export async function GET(req: NextRequest) {
  return proxyJson(req, "/api/profile/config", "GET");
}

// wipe the saved profile config; proxyJson relays the backend's status/body straight through
export async function DELETE(req: NextRequest) {
  return proxyJson(req, "/api/profile/config", "DELETE");
}
