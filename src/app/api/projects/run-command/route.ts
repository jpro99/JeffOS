import { NextResponse } from "next/server";
import { runDetectedBuild, runProjectCommand, resolveBuildCommand } from "@/lib/project-scan/run-command";
import { detectRepoProfile } from "@/lib/project-scan/detect-repo";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 200;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      project?: Project;
      command?: string;
      cwd?: string;
      detectBuild?: boolean;
    };
    const cwd =
      body.cwd?.trim() ||
      body.project?.path?.trim() ||
      (body.project ? suggestProjectFolder(body.project) : "");

    if (body.detectBuild) {
      if (!cwd) {
        return NextResponse.json({ ok: false, error: "No project path" }, { status: 400 });
      }
      const profile = detectRepoProfile(cwd);
      const result = await runDetectedBuild(cwd);
      return NextResponse.json(
        { ...result, repoProfile: profile },
        { status: result.ok || result.output ? 200 : 400 },
      );
    }

    const command = body.command?.trim();
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const folderPath = url.searchParams.get("path")?.trim();
  if (!folderPath) {
    return NextResponse.json({ ok: false, error: "path required" }, { status: 400 });
  }
  const profile = detectRepoProfile(folderPath);
  return NextResponse.json({
    ok: true,
    profile,
    buildCommand: resolveBuildCommand(folderPath),
  });
}
