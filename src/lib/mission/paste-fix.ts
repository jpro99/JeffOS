import type { MissionControlState, Project } from "@/lib/types";
import { buildCompactFixPrompt } from "@/lib/mission/cursor-prompts";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import {
  isBuildWarningsOnly,
  isSuccessfulBuildOutput,
} from "@/lib/mission/build-output";
import {
  analyzeBuildLog,
  classifyPasteKind,
  type PasteIssueKind,
} from "@/lib/project-scan/error-patterns";
import { DEFAULT_REPO_PROFILE, type RepoProfile } from "@/lib/project-scan/repo-profile";

export type { PasteIssueKind };

export interface PasteAnalysis {
  kind: PasteIssueKind;
  headline: string;
  summary: string;
  rootCause?: string;
  cursorHint?: string;
  fileRefs: string[];
  errorLines: string[];
  runCommands: string[];
  patternId?: string;
  fixType?: "toolchain" | "code" | "config" | "env";
  doNotRewriteAppCode?: boolean;
}

function repoProfileForProject(project: Project): RepoProfile {
  return project.ops.repoProfile ?? DEFAULT_REPO_PROFILE;
}

function buildContext(project: Project) {
  const repoPath = project.path?.trim() || suggestProjectFolder(project);
  return { repoPath, repoProfile: repoProfileForProject(project) };
}

export function classifyPaste(text: string): PasteIssueKind {
  return classifyPasteKind(text);
}

export function analyzePaste(text: string, project: Project): PasteAnalysis {
  const ctx = buildContext(project);
  const result = analyzeBuildLog(text, ctx);

  if (isSuccessfulBuildOutput(text.trim())) {
    const warningsOnly = isBuildWarningsOnly(text);
    return {
      kind: "unknown",
      headline: warningsOnly ? "Build passed (warnings only)" : "Build passed",
      summary: warningsOnly
        ? "Build succeeded. Optional Turbopack trace warning — not a failure."
        : "Build succeeded. Nothing broken in this paste.",
      fileRefs: [],
      errorLines: [],
      runCommands: result.runCommands,
    };
  }

  return {
    kind: result.kind,
    headline: result.headline,
    summary: result.summary,
    rootCause: result.matched?.rootCause,
    cursorHint: result.matched?.cursorHint,
    fileRefs: result.fileRefs,
    errorLines: result.errorLines,
    runCommands: result.runCommands,
    patternId: result.matched?.patternId,
    fixType: result.matched?.fixType,
    doNotRewriteAppCode: result.matched?.doNotRewriteAppCode,
  };
}

export function buildPasteFixPrompt(
  pasted: string,
  project: Project,
  state: MissionControlState,
  analysis: PasteAnalysis,
): string {
  return buildCompactFixPrompt(project, state, { analysis, pastedLog: pasted });
}

export function buildQuickRunBlock(analysis: PasteAnalysis): string {
  return analysis.runCommands.join("\n");
}
