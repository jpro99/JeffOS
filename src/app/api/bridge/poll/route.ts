import { NextResponse } from "next/server";
import { pollBridgeJob } from "@/lib/bridge/job-store";

export const runtime = "nodejs";

/** PC bridge polls for the next pending Cursor job */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token")?.trim() ||
    request.headers.get("x-jeff-bridge-token")?.trim() ||
    "";
  if (!token || token.length < 8) {
    return NextResponse.json({ ok: false, error: "Token required" }, { status: 401 });
  }

  const job = pollBridgeJob(token);
  if (!job) {
    return NextResponse.json({ ok: true, job: null });
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      folderPath: job.folderPath,
      prompt: job.prompt,
      createdAt: job.createdAt,
    },
  });
}
