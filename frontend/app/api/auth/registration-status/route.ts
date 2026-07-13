import { NextResponse } from "next/server";

// lets the signup page know whether to show the form or a "closed" notice
export async function GET() {
  return NextResponse.json({ enabled: process.env.ALLOW_REGISTRATION === "true" });
}
