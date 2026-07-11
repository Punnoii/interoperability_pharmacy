import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ enabled: process.env.ALLOW_REGISTRATION === "true" });
}
