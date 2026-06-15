import { NextResponse } from "next/server";
import { checkFolderStatus } from "@/lib/project-scan/folder-status";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string; project?: Project };
    const target = body.path?.trim() || body.project?.path?.trim() || (body.project ? suggestProjectFolder(body.project) : "");
    const result = checkFolderStatus(target);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Folder check failed";
    return NextResponse.json({ ok: false, exists: false, message }, { status: 500 });
  }
}
