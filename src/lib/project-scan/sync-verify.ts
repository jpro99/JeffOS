import type { Project, ProjectError, ProjectOps } from "@/lib/types";
import type { VerifyIssue, VerifyResult } from "@/lib/project-scan/verify";

export interface VerifyReport {
  status: "clear" | "still-blocked";
  buildPassed: boolean;
  lintPassed: boolean | null;
  summary: string;
  resolvedTitles: string[];
  stillOpenErrors: { id: string; title: string; severity: string }[];
  stillOpenBlockers: string[];
  newFromVerify: string[];
  buildLogTail: string;
  lintAdvisory?: boolean;
  lintNote?: string;
  projectPath?: string;
  canAdvance: boolean;
}

function verifyIssueToError(issue: VerifyIssue): ProjectError {
  const id = issue.id.startsWith("verify-") ? issue.id : `verify-${issue.id}`;
  const isToolchain = issue.fixType === "toolchain";
  return {
    id,
    title: issue.title,
    likelyCause: issue.detail.slice(0, 200),
    severity: issue.severity,
    fixRisk: isToolchain ? "safe" : "medium",
    confidence: issue.patternId ? 0.95 : 0.92,
    recommendedFix: isToolchain
      ? "Fix toolchain: corepack enable, install package manager, then rebuild"
      : `Fix: ${issue.title}`,
    aboutToDo: issue.detail.slice(0, 500),
    whyDoingIt: issue.patternId
      ? `Matched error pattern ${issue.patternId} from build log`
      : "Build/lint verify found this on disk",
    couldGoWrong: isToolchain
      ? "Do not rewrite app code until pnpm/npm install succeeds"
      : "May be one of several compile errors — fix and recheck",
    taskType: issue.source === "lint" ? "test" : "bugfix",
    resolved: false,
    fixType: issue.fixType,
    patternId: issue.patternId,
    doNotRewriteAppCode: isToolchain,
  };
}

function isBuildGateBlocker(text: string): boolean {
  return /build|lint|compile|npm run|deploy fail|vercel|postinstall|worker/i.test(text);
}

function titlesOverlap(a: string, b: string): boolean {
  const na = a.toLowerCase();
  const nb = b.toLowerCase();
  if (na.includes(nb.slice(0, 20)) || nb.includes(na.slice(0, 20))) return true;
  const words = ["maplibre", "worker", "build", "postinstall", "compile", "typescript"];
  return words.some((w) => na.includes(w) && nb.includes(w));
}

/** Merge npm build/lint results into Jeff OS ops — never fakes “all fixed”. */
export function applyVerifyToProject(
  project: Project,
  verify: VerifyResult,
): { ops: ProjectOps; report: VerifyReport } {
  const mission = project.ops.errorFixMission;
  const resolvedTitles: string[] = [];
  const verifyPassed = verify.buildPassed;
  const buildLog = verify.buildLogTail;

  let allErrors = project.ops.errors.map((e) => ({ ...e }));
  let blockers = project.ops.blockers.filter(
    (b) => b !== "Build failing" && b !== "Lint failing",
  );

  if (verifyPassed) {
    allErrors = allErrors.map((e) => {
      if (e.resolved) return e;
      resolvedTitles.push(e.title);
      return { ...e, resolved: true };
    });

    blockers = blockers.filter((b) => {
      if (isBuildGateBlocker(b)) {
        resolvedTitles.push(b);
        return false;
      }
      return true;
    });
  } else {
    allErrors = allErrors.filter((e) => e.resolved || !e.id.startsWith("verify-"));

    if (verify.openIssues.length > 0) {
      allErrors = allErrors.map((e) => {
        if (e.resolved || e.id.startsWith("verify-")) return e;
        if (e.taskType === "bugfix" || e.taskType === "test") {
          resolvedTitles.push(`${e.title} (replaced by build log)`);
          return { ...e, resolved: true };
        }
        return e;
      });
    }

    const verifyErrors: ProjectError[] = verify.openIssues
      .filter((i) => i.source === "build" || (i.source === "scan" && !verify.buildPassed))
      .map(verifyIssueToError);
    allErrors = [...allErrors, ...verifyErrors];

    if (!verify.buildPassed) blockers.push("Build failing");
    // Lint is advisory only — ship gate is npm run build (matches Vercel)
  }

  blockers = [...new Set(blockers)];

  const stillOpenErrors = allErrors
    .filter((e) => !e.resolved)
    .map((e) => ({ id: e.id, title: e.title, severity: e.severity }));

  const canAdvance = stillOpenErrors.length === 0 && blockers.length === 0;

  let errorFixMission = mission;
  if (mission) {
    if (canAdvance) {
      errorFixMission = {
        ...mission,
        status: "complete",
        completedAt: verify.verifiedAt,
        lastVerifiedAt: verify.verifiedAt,
        lastVerifyPassed: true,
        lastVerifySummary: verify.summary,
      };
    } else {
      errorFixMission = {
        ...mission,
        status: mission.lastPrompt ? "running" : mission.status,
        lastVerifiedAt: verify.verifiedAt,
        lastVerifyPassed: verifyPassed,
        lastVerifySummary: verify.summary,
      };
    }
  }

  let summary = verify.summary;
  if (!canAdvance) {
    const parts: string[] = [];
    if (!verify.buildPassed) parts.push("build failed");
    if (verify.lintPassed === false) parts.push("lint needs fix (optional)");
    const primary = verify.openIssues[0]?.title ?? stillOpenErrors[0]?.title;
    if (primary) parts.push(primary.slice(0, 80));
    else if (stillOpenErrors.length > 0) {
      parts.push(`${stillOpenErrors.length} issue(s) still open`);
    }
    if (blockers.length > 0) {
      parts.push(`${blockers.length} blocker(s)`);
    }
    summary = parts.join(" · ");
  } else {
    summary = verify.lintPassed === false
      ? "Build passed — ready to ship (lint optional cleanup later)"
      : "All clear — build passed, no open errors";
  }

  const report: VerifyReport = {
    status: canAdvance ? "clear" : "still-blocked",
    buildPassed: verify.buildPassed,
    lintPassed: verify.lintPassed,
    summary,
    resolvedTitles,
    stillOpenErrors,
    stillOpenBlockers: blockers,
    newFromVerify: verify.openIssues.filter((i) => i.source === "build").map((i) => i.title),
    buildLogTail: buildLog,
    lintAdvisory: verify.lintPassed === false && verify.buildPassed,
    lintNote:
      verify.lintPassed === false && verify.buildPassed
        ? "npm run lint failed — does not block ship. Vercel uses build."
        : undefined,
    projectPath: verify.projectPath,
    canAdvance,
  };

  const stability =
    canAdvance && project.ops.stability.status !== "good"
      ? {
          ...project.ops.stability,
          label: "Improved after verify pass",
          status: "good" as const,
          score: Math.min(100, project.ops.stability.score + 8),
        }
      : !verify.buildPassed
        ? {
            ...project.ops.stability,
            label: "Build failing on disk",
            status: "bad" as const,
            score: Math.max(0, project.ops.stability.score - 5),
          }
        : project.ops.stability;

  return {
    ops: {
      ...project.ops,
      errors: allErrors,
      blockers,
      errorFixMission,
      stability,
    },
    report,
  };
}
