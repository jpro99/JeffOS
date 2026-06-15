import { addPromptSummary, buildCompactAddPrompt } from "@/lib/mission/cursor-prompts";
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
): AddToProjectResult | null {
  const trimmed = intent.trim();
  if (!trimmed) return null;

  const { prompt, stepCount } = buildCompactAddPrompt(project, trimmed, state);
  const summary = addPromptSummary(trimmed);

  return {
    prompt,
    project: {
      ...project,
      ops: {
        ...project.ops,
        commandSession: {
          id: project.ops.commandSession?.id ?? uid("cmd"),
          intent: trimmed,
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
