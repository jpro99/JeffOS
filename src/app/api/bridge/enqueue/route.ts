import { NextResponse } from "next/server";
import { enqueueBridgeJob } from "@/lib/bridge/job-store";

export const runtime = "nodejs";

/** Lemon → queue a Cursor-open job for the PC bridge to poll */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      folderPath?: string;
      prompt?: string;
    };
    const token = body.token?.trim();
    const folderPath = body.folderPath?.trim();
    if (!token || token.length < 8) {
      return NextResponse.json({ ok: false, error: "Bridge token required" }, { status: 400 });
    }
    if (!folderPath) {
      return NextResponse.json({ ok: false, error: "No folder path" }, { status: 400 });
    }

    const job = enqueueBridgeJob({ token, folderPath, prompt: body.prompt });
    return NextResponse.json({
      ok: true,
      id: job.id,
      message: "Queued for your PC bridge — keep npm run bridge running",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Enqueue failed" },
      { status: 500 },
    );
  }
}
