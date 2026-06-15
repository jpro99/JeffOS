import { NextResponse } from "next/server";
import path from "path";
import { readGitStatus } from "@/lib/project-scan/git-status";import { DEFAULT_PROJECTS_ROOT, EXTRA_SCAN_ROOTS } from "@/lib/discovery/catalog";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED_ROOTS = [DEFAULT_PROJECTS_ROOT, ...EXTRA_SCAN_ROOTS].map((r) =>
  path.normalize(r).toLowerCase(),
);

function isAllowedPath(target: string): boolean {
  const normalized = path.normalize(target).toLowerCase();
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: Project };
    const project = body.project;

    if (!project?.path) {
      return NextResponse.json({ ok: false, error: "No project path" }, { status: 400 });
    }

    if (!isAllowedPath(project.path)) {
      return NextResponse.json({ ok: false, error: "Path not in allowed roots" }, { status: 403 });
    }

    const git = await readGitStatus(project.path);
    const { scanProjectFolder } = await import("@/lib/project-scan/scan-folder.server");
    const scan = scanProjectFolder(project.path);
    return NextResponse.json({
      ok: true,
      git,
      vercelLinked: scan.vercelLinked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git status failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
