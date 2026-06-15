import type { FolderScan } from "@/lib/project-scan/analyze";
import type { ConnectionInventoryItem } from "@/lib/connections/inventory";
import type { Project, ProjectOps, ReadinessLevel } from "@/lib/types";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";
import type { VerifyResult } from "@/lib/project-scan/verify";

export interface LiveVerifySnapshot {
  at: string;
  buildPassed: boolean;
  canAdvance: boolean;
  summary: string;
}

const BUILD_RESOLVED = /postinstall|maplibre|worker|build before|fix postinstall|canonical fork|pick canonical|npm run build|ci build|build gate|every push|deploy fail|vercel build|intermittent build/i;
const FORK_RESOLVED = /canonical repo|dead fork|fork consolidation|repo folder/i;
const CI_RESOLVED = /ci build|npm run build in ci|build in ci|build before push/i;
/** Nice-to-have backlog — not "broken", hide from live gap count */
const OPTIONAL_BACKLOG = /cost monitoring|sentry alert|monitoring|agent auto-update|marketing site polish/i;

function hasCiWorkflow(scan: FolderScan): boolean {
  return (
    scan.topLevel.includes(".github") ||
    scan.signals.some((s) => /github ci|ci workflow/i.test(s))
  );
}

function shouldDropBacklogItem(
  text: string,
  scan: FolderScan,
  verifyPassed: boolean,
): boolean {
  const t = text.toLowerCase();
  if (!verifyPassed) return false;

  if (BUILD_RESOLVED.test(text)) return true;
  if (FORK_RESOLVED.test(text) && scan.hasGit && scan.exists) return true;
  if (CI_RESOLVED.test(text) && (hasCiWorkflow(scan) || verifyPassed)) return true;
  if (/connect vercel/i.test(text) && scan.vercelLinked) return true;
  if (/vercel/i.test(t) && scan.vercelLinked && /build|deploy|link/i.test(t)) return true;
  if (/polish self-build|self-build ux/i.test(text) && scan.signals.some((s) => s.includes("Self-build UX"))) {
    return true;
  }
  if (/optional vercel deploy/i.test(text) && scan.signals.some((s) => s.includes("Vercel config"))) {
    return true;
  }
  if (/add ci on github/i.test(text) && scan.signals.some((s) => s.includes("GitHub CI"))) {
    return true;
  }

  return false;
}

/** After disk scan + optional verify, drop stale seed backlog and store honest verify snapshot. */
export function reconcileOpsFromScan(
  project: Project,
  scan: FolderScan,
  verify?: VerifyResult,
  report?: VerifyReport,
): ProjectOps {
  const ops = project.ops;
  const verifyPassed = verify?.buildPassed ?? false;
  const canAdvance = report?.canAdvance ?? false;

  const drop = (items: string[]) =>
    items.filter((item) => !shouldDropBacklogItem(item, scan, verifyPassed));

  let whatsNext = drop(ops.whatsNext);
  let blockers = drop(ops.blockers);
  let missingPieces = drop(ops.missingPieces);
  const hardeningSteps = drop(ops.hardeningSteps);

  if (canAdvance) {
    blockers = blockers.filter((b) => !BUILD_RESOLVED.test(b));
    whatsNext = whatsNext.filter((w) => !BUILD_RESOLVED.test(w));
  }

  if (scan.vercelLinked) {
    missingPieces = missingPieces.filter((m) => !/connect vercel|vercel link/i.test(m));
  }

  if (verifyPassed && scan.hasGit && scan.exists) {
    missingPieces = missingPieces.filter((m) => !FORK_RESOLVED.test(m));
  }

  let readinessLevel: ReadinessLevel = ops.readinessLevel;
  let percentComplete = ops.percentComplete;

  if (canAdvance) {
    readinessLevel =
      scan.vercelLinked && scan.hasTests ? "beta" : scan.vercelLinked ? "usable" : "partially-working";
    percentComplete = Math.max(
      percentComplete,
      scan.vercelLinked ? 92 : scan.hasBuildOutput ? 88 : 85,
    );
  } else if (verifyPassed) {
    percentComplete = Math.max(percentComplete, 80);
    if (readinessLevel === "needs-repair") readinessLevel = "partially-working";
  }

  const liveVerify: LiveVerifySnapshot | undefined = verify
    ? {
        at: verify.verifiedAt,
        buildPassed: verify.buildPassed,
        canAdvance,
        summary: report?.summary ?? verify.summary,
      }
    : ops.liveVerify;

  return {
    ...ops,
    whatsNext,
    blockers,
    missingPieces,
    hardeningSteps,
    readinessLevel,
    percentComplete,
    liveVerify,
    repoProfile: scan.repoProfile ?? ops.repoProfile,
  };
}

/** Gaps that actually block ship — not old seed notes. */
export function collectLiveGaps(
  project: Project,
  scan: FolderScan,
  inventory: ConnectionInventoryItem[],
  verify?: LiveVerifySnapshot,
): { id: string; title: string; category: string; detail: string; source: string }[] {
  const gaps: { id: string; title: string; category: string; detail: string; source: string }[] = [];
  const seen = new Set<string>();

  const add = (
    title: string,
    category: string,
    detail: string,
    source: string,
  ) => {
    const key = title.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    gaps.push({ id: key, title, category, detail, source });
  };

  if (!scan.exists) {
    add("Project folder missing on this machine", "disk", project.path ?? "Path not set", "disk scan");
  } else if (!scan.hasPackageJson && !scan.signals.some((s) => s.includes(".NET"))) {
    add("No runnable app scaffold detected", "disk", scan.path, "disk scan");
  }

  if (verify && !verify.buildPassed) {
    add("npm run build failing on disk", "build", verify.summary, "verify build");
  }

  for (const e of project.ops.errors.filter((x) => !x.resolved)) {
    add(e.title, "error", e.likelyCause, "Jeff OS errors");
  }

  for (const b of project.ops.blockers) {
    add(b, "blocker", "Logged blocker", "Jeff OS blockers");
  }

  for (const item of inventory) {
    if (item.status === "connected") continue;
    add(
      `Connect ${item.name}`,
      "connection",
      item.statusLabel,
      item.verifyMethod === "catalog-only" ? "catalog" : "connection scan",
    );
  }

  for (const item of project.ops.whatsNext) {
    if (OPTIONAL_BACKLOG.test(item)) continue;
    add(item, "needs-build", "Still on build queue", "ops.whatsNext");
  }

  for (const item of project.ops.missingPieces) {
    if (OPTIONAL_BACKLOG.test(item)) continue;
    add(item, "not-built", "Logged missing piece", "ops.missingPieces");
  }

  for (const item of project.ops.hardeningSteps) {
    if (OPTIONAL_BACKLOG.test(item)) continue;
    add(item, "hardening", "Hardening step", "ops.hardeningSteps");
  }

  return gaps.slice(0, 20);
}

export function countLiveGaps(
  project: Project,
  scan: FolderScan,
  inventory: ConnectionInventoryItem[],
  verify?: LiveVerifySnapshot,
): number {
  return collectLiveGaps(project, scan, inventory, verify).length;
}
