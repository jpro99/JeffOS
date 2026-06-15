import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  parseGodBotSections,
  scanProjectFolder,
} from "@/lib/project-scan/analyze";
import { buildProjectBrief } from "@/lib/project-scan/brief";
import { buildConnectionInventory } from "@/lib/connections/inventory";
import { applyVerifyToProject } from "@/lib/project-scan/sync-verify";
import { reconcileOpsFromScan } from "@/lib/project-scan/reconcile";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";
import { verifyProjectBuild } from "@/lib/project-scan/verify";
import type { VerifyResult } from "@/lib/project-scan/verify";
import { resolveGodBotRelativePath, toAbsolute, isUnderCommandCenter, isSafeRelative } from "@/lib/command-center/paths";
import { DEFAULT_PROJECTS_ROOT, EXTRA_SCAN_ROOTS } from "@/lib/discovery/catalog";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

const ALLOWED_ROOTS = [DEFAULT_PROJECTS_ROOT, ...EXTRA_SCAN_ROOTS].map((r) =>
  path.normalize(r).toLowerCase(),
);

function isAllowedPath(target: string): boolean {
  const normalized = path.normalize(target).toLowerCase();
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}

function loadGodBot(slug: string, godBotFile?: string) {
  const relative = godBotFile ?? `projects/${slug}.md`;
  if (!isSafeRelative(relative)) return { purpose: "", goals: [], gotchas: [] };

  const absolute = toAbsolute(relative);
  if (!isUnderCommandCenter(absolute) || !fs.existsSync(absolute)) {
    return { purpose: "", goals: [], gotchas: [] };
  }

  const content = fs.readFileSync(absolute, "utf8");
  return parseGodBotSections(content);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project?: Project; verify?: boolean };
    const project = body.project;
    const runVerify = body.verify === true;

    if (!project) {
      return NextResponse.json({ ok: false, error: "No project" }, { status: 400 });
    }

    if (!project.path) {
      const emptyScan = scanProjectFolder("");
      return NextResponse.json({
        ok: true,
        scan: emptyScan,
        brief: buildProjectBrief(project, emptyScan),
        inventory: buildConnectionInventory(project, emptyScan),
        warning: "No project path — scan projects from disk first",
      });
    }

    if (!isAllowedPath(project.path)) {
      return NextResponse.json({ ok: false, error: "Path not in allowed roots" }, { status: 403 });
    }

    const scan = scanProjectFolder(project.path);
    const godBot = loadGodBot(project.slug, project.godBotFile ?? resolveGodBotRelativePath(project));

    let verify: VerifyResult | undefined;
    let report: VerifyReport | undefined;
    let opsForBrief = reconcileOpsFromScan(project, scan);

    if (runVerify) {
      verify = await verifyProjectBuild(project.path, scan);
      const applied = applyVerifyToProject(project, verify);
      opsForBrief = reconcileOpsFromScan({ ...project, ops: applied.ops }, scan, verify, applied.report);
      report = applied.report;
    }

    const brief = buildProjectBrief({ ...project, ops: opsForBrief }, scan, godBot);
    const inventory = buildConnectionInventory({ ...project, ops: opsForBrief }, scan);

    return NextResponse.json({
      ok: true,
      scan,
      brief,
      inventory,
      verify,
      report,
      folderExists: scan.exists,
      updatedOps: opsForBrief,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
