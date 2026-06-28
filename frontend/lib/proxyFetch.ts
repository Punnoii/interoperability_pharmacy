import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "./config";

export const BACKEND_URL = APP_CONFIG.api.backendUrl;

export function forwardCookie(res: Response, init: ResponseInit = {}): ResponseInit {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return init;
  const headers = new Headers(init.headers);
  headers.append("set-cookie", setCookie);
  return { ...init, headers };
}

export async function proxyJson(req: NextRequest, path: string, method: "GET" | "POST" | "DELETE" = "GET") {
  const cookie = req.headers.get("cookie") || "";
  const body = method === "POST" ? await req.text() : undefined;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
  });
  const text = await res.text();
  return new NextResponse(text, forwardCookie(res, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  }));
}

export async function proxyMultipart(req: NextRequest, path: string) {
  const cookie = req.headers.get("cookie") || "";
  const form = await req.formData();
  const upstream = new FormData();
  for (const [k, v] of form.entries()) upstream.append(k, v);
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { cookie },
    body: upstream,
  });
  const text = await res.text();
  return new NextResponse(text, forwardCookie(res, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  }));
}
