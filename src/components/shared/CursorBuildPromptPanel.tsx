"use client";

import { useMemo } from "react";
import { buildCommandMissionBundle } from "@/lib/mission/command-session";
import { flattenMissionSteps } from "@/lib/mission/bundle";
import { CopyButton } from "@/components/ui/CopyButton";
import type { MissionControlState, Project } from "@/lib/types";

export function CursorBuildPromptPanel({
  project,
  state,
  intent,
  title = "Copy this whole box → paste in Cursor",
  minRows = 16,
}: {
  project: Project;
  state: MissionControlState;
  intent?: string;
  title?: string;
  minRows?: number;
}) {
  const resolvedIntent =
    intent?.trim() ||
    project.ops.commandSession?.intent ||
    project.orchestration?.scope.pitch ||
    project.description ||
    `Build ${project.name}`;

  const prompt = useMemo(() => {
    const saved = project.ops.commandSession?.lastPrompt;
    if (saved && project.orchestration?.plan?.approved) return saved;
    return buildCommandMissionBundle(project, resolvedIntent, state);
  }, [project, resolvedIntent, state]);

  const stepCount = flattenMissionSteps(project).length;
  const approved = project.orchestration?.plan?.approved;

  if (!approved && stepCount === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Generate plan → Approve plan — your full Cursor prompt appears here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-teal-200">{title}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {stepCount} bot step{stepCount === 1 ? "" : "s"} · Click box to select all, or tap Copy
          </p>
        </div>
        <CopyButton text={prompt} label="Copy all" />
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={minRows}
        aria-label="Cursor build prompt"
        className="w-full cursor-text rounded-xl border border-teal-500/20 bg-black/60 px-3 py-3 font-mono text-[11px] leading-relaxed text-zinc-300 focus:border-teal-500/40 focus:outline-none"
        onFocus={(e) => e.target.select()}
        onClick={(e) => e.currentTarget.select()}
      />
      <p className="text-[10px] text-zinc-600">
        Open Cursor on{" "}
        <span className="font-mono text-zinc-500">{project.path ?? "your project folder"}</span> →
        agent chat → paste → Enter
      </p>
    </div>
  );
}
