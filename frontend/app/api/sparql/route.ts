import { NextRequest, NextResponse } from "next/server";
import { APP_CONFIG } from "@/lib/config";
import { getSession } from "@/lib/session";

const { backendUrl, routes } = APP_CONFIG.api;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json();

    const res = await fetch(`${backendUrl}${routes.sparql}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const text = await res.text();

    return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
}
