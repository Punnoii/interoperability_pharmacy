import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "./config";

export const BACKEND_URL = APP_CONFIG.api.backendUrl;

// copy an upstream Set-Cookie back onto our response so backend-issued auth cookies reach the browser
export function forwardCookie(res: Response, init: ResponseInit = {}): ResponseInit {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return init;
  const headers = new Headers(init.headers);
  headers.append("set-cookie", setCookie);
  return { ...init, headers };
}

// relay a json request to the spring backend, passing the caller's cookie through for auth and streaming the reply back verbatim
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

// same idea as proxyJson but for file uploads, rebuild the FormData so fetch sets its own multipart boundary
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
