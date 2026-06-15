import type { MissionControlState, Project } from "@/lib/types";
import { errorsToPasteText } from "@/lib/intelligence/quick-action-guide";
import { buildCompactFixPrompt } from "@/lib/mission/cursor-prompts";
import { countFixableIssues } from "@/lib/mission/error-fix";
import { analyzePaste } from "@/lib/mission/paste-fix";
import { isSuccessfulBuildOutput } from "@/lib/mission/build-output";
import { copyToClipboard } from "@/lib/utils";

export interface FixErrorsResult {
  ok: boolean;
  buildPassed: boolean;
  copied: boolean;
  message: string;
  prompt: string;
  output: string;
}

function promptFromKnownIssues(project: Project, state: MissionControlState): string {
  return buildCompactFixPrompt(project, state, {
    issueTitles: [
      ...project.ops.errors.filter((e) => !e.resolved).map((e) => e.title),
      ...project.ops.blockers,
    ],
  });
}

function promptFromBuildOutput(
  output: string,
  project: Project,
  state: MissionControlState,
): string {
  const analysis = analyzePaste(output, project);
  return buildCompactFixPrompt(project, state, { analysis, pastedLog: output });
}

/** Runs build locally, builds a short fix prompt, copies to clipboard. */
export async function runFixErrors(
  project: Project,
  state: MissionControlState,
): Promise<FixErrorsResult> {
  if (!project.path?.trim()) {
    return {
      ok: false,
      buildPassed: false,
      copied: false,
      message: "Pick your project folder first — Browse on my PC, then Apply folder.",
      prompt: "",
      output: "",
    };
  }

  const open = project.ops.errors.filter((e) => !e.resolved);
  if (open.length > 0) {
    window.dispatchEvent(new CustomEvent("jeff-set-paste-fix", { detail: errorsToPasteText(open) }));
  }

  const res = await fetch("/api/projects/run-command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, detectBuild: true }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    output?: string;
    message?: string;
    buildCommand?: string;
    repoProfile?: Project["ops"]["repoProfile"];
  };
  const output = data.output?.trim() ?? "";
  const projectForPrompt =
    data.repoProfile && project.ops.repoProfile !== data.repoProfile ?
      { ...project, ops: { ...project.ops, repoProfile: data.repoProfile } }
    : project;

  if (!output) {
    const fallback = promptFromKnownIssues(project, state);
    if (fallback) {
      const copied = await copyToClipboard(fallback);
      return {
        ok: true,
        buildPassed: false,
        copied,
        message: copied ?
          "Fix prompt copied — paste in Cursor Agent (Ctrl+V)."
        : "Fix prompt ready below — copy and paste in Cursor.",
        prompt: fallback,
        output: "",
      };
    }
    return {
      ok: false,
      buildPassed: false,
      copied: false,
      message:
        data.message ??
        "Could not run build. Start Jeff OS with npm run dev on your PC (localhost only).",
      prompt: "",
      output: "",
    };
  }

  window.dispatchEvent(new CustomEvent("jeff-set-paste-fix", { detail: output }));

  const buildPassed = isSuccessfulBuildOutput(output);
  let prompt = "";

  if (!buildPassed) {
    prompt = promptFromBuildOutput(output, projectForPrompt, state);
  } else if (countFixableIssues(project) > 0) {
    prompt = promptFromKnownIssues(project, state);
  }

  if (prompt) {
    const copied = await copyToClipboard(prompt);
    const fromBuild = !buildPassed;
    return {
      ok: true,
      buildPassed: buildPassed && !fromBuild,
      copied,
      message: copied ?
        fromBuild ?
          "Build failed — fix prompt copied. Paste in Cursor, then Check again."
        : "Issues remain — fix prompt copied. Paste in Cursor, then Check again."
      : "Fix prompt below — copy and paste in Cursor Agent.",
      prompt,
      output,
    };
  }

  return {
    ok: true,
    buildPassed: true,
    copied: false,
    message: analyzePaste(output, projectForPrompt).summary,
    prompt: "",
    output,
  };
}
