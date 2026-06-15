import { addPromptSummary, buildCompactAddPrompt } from "@/lib/mission/cursor-prompts";
import type { DesignReference } from "@/lib/mission/design-from-image";
import type { MissionControlState, Project } from "@/lib/types";
import { uid } from "@/lib/utils";

export interface AddToProjectResult {
  prompt: string;
  project: Project;
  stepCount: number;
  featureCount: number;
  summary: string;
}

/** Plain-English add/change request → short Cursor prompt (not Fix Errors). */
export function buildAddToProjectPrompt(
  project: Project,
  intent: string,
  state: MissionControlState,
  designRef?: DesignReference,
): AddToProjectResult | null {
  const trimmed = intent.trim();
  if (!trimmed && !designRef) return null;

  const intentText =
    trimmed ||
    (designRef ?
      "Match the attached reference screenshot — replicate colors, layout, and UI scheme"
    : "");

  const { prompt, stepCount } = buildCompactAddPrompt(project, intentText, state, designRef);
  const summary = designRef ?
    `${addPromptSummary(intentText)} + design ref`
  : addPromptSummary(intentText);

  return {
    prompt,
    project: {
      ...project,
      ops: {
        ...project.ops,
        commandSession: {
          id: project.ops.commandSession?.id ?? uid("cmd"),
          intent: intentText,
          createdAt: project.ops.commandSession?.createdAt ?? new Date().toISOString(),
          lastPrompt: prompt,
          stepCount,
          featureCount: 1,
        },
      },
    },
    stepCount,
    featureCount: 1,
    summary,
  };
}
