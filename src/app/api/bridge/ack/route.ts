import { NextResponse } from "next/server";
import { ackBridgeJob } from "@/lib/bridge/job-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; id?: string };
    const token =
      body.token?.trim() || request.headers.get("x-jeff-bridge-token")?.trim() || "";
    const id = body.id?.trim();
    if (!token || !id) {
      return NextResponse.json({ ok: false, error: "token + id required" }, { status: 400 });
    }
    const ok = ackBridgeJob(token, id);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Ack failed" },
      { status: 500 },
    );
  }
}
