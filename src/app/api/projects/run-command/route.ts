import { NextResponse } from "next/server";
import { runProjectCommand } from "@/lib/project-scan/run-command";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 200;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: Project; command?: string; cwd?: string };
    const command = body.command?.trim();
    const cwd = body.cwd?.trim() || body.project?.path?.trim() || (body.project ? suggestProjectFolder(body.project) : "");

    if (!command) {
      return NextResponse.json({ ok: false, error: "No command" }, { status: 400 });
    }

    const result = await runProjectCommand(cwd, command);
    return NextResponse.json(result, { status: result.ok || result.output ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run command failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
