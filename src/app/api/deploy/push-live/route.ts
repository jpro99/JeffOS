import { NextResponse } from "next/server";
import type { Project } from "@/lib/types";
import { executePushLive } from "@/lib/deploy/push-live-exec";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: Project; message?: string };
    const project = body.project;
    if (!project?.path) {
      return NextResponse.json({ ok: false, message: "No project folder — import or set path first" }, { status: 400 });
    }

    const message = (body.message ?? `${project.name} live update`).trim();
    const result = await executePushLive(project.path, message);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
