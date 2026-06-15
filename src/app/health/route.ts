import { NextResponse } from "next/server";

/** Load balancers, Vercel, and monitors often probe GET /health */
export async function GET() {
  return NextResponse.json(
    { ok: true, status: "healthy", service: "jeff-mission-control" },
    { status: 200 },
  );
}
