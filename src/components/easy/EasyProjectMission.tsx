"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Project, ProjectFeature } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { flattenMissionSteps } from "@/lib/mission/bundle";
import { EasyProjectBrief } from "@/components/easy/EasyProjectBrief";
import { ProjectFixHub } from "@/components/shared/ProjectFixHub";
import { ProjectJourneyFlow } from "@/components/journey/ProjectJourneyFlow";
import { JourneyBrainstormPanel } from "@/components/journey/JourneyBrainstormPanel";
import { QuickCommands } from "@/components/workspace/QuickCommands";
import { cn } from "@/lib/utils";

export function EasyProjectMission({ project }: { project: Project }) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [pasteSeed, setPasteSeed] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const live = state.projects.find((p) => p.id === project.id) ?? project;
  const steps = useMemo(() => flattenMissionSteps(live), [live]);
  const doneCount = steps.filter((s) => s.status === "done").length;

  const markStepDone = (featureId: string, stepPhase: string) => {
    const orch = live.orchestration;
    if (!orch) return;
    const features = orch.features.map((f) => {
      if (f.id !== featureId) return f;
      const assignedSteps = f.assignedSteps.map((s) =>
        s.phase === stepPhase ? { ...s, status: "done" as const } : s,
      );
      const allDone = assignedSteps.every((s) => s.status === "done" || s.status === "skipped");
      return {
        ...f,
        assignedSteps,
        status: allDone ? ("done" as ProjectFeature["status"]) : ("building" as const),
        updatedAt: new Date().toISOString(),
      };
    });
    updateProject({ ...live, orchestration: { ...orch, features } });
    addActivity(`Marked step done: ${stepPhase}`, "project", project.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/easy/projects" className="text-sm text-zinc-600 hover:text-teal-500">
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">{live.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{live.ops.plainSummary}</p>
      </div>

      <ProjectJourneyFlow project={live} onRefresh={() => setRefreshToken((n) => n + 1)} />

      <QuickCommands project={live} />

      <ProjectFixHub project={live} initialPaste={pasteSeed || undefined} compact />

      <JourneyBrainstormPanel project={live} />

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="w-full rounded-xl border border-dashed border-white/10 py-2 text-xs text-zinc-600 hover:text-zinc-400"
      >
        {showDetails ? "Hide" : "Show"} scan snapshot & checklist
      </button>

      {showDetails && (
        <>
          <EasyProjectBrief
            key={refreshToken}
            project={live}
            onPasteSeed={setPasteSeed}
            refreshToken={refreshToken}
          />

          {steps.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-white/[0.08] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Checklist</p>
                <span className="text-xs text-zinc-500">
                  {doneCount}/{steps.length}
                </span>
              </div>
              <ul className="space-y-2">
                {steps.map((s) => (
                  <li
                    key={s.key}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                      s.status === "done"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-white/[0.06] bg-white/[0.02]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => markStepDone(s.featureId, s.phase)}
                      disabled={s.status === "done"}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                        s.status === "done"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-white/[0.06] text-zinc-500 hover:bg-teal-500/20 hover:text-teal-300",
                      )}
                    >
                      {s.status === "done" ? "✓" : "○"}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200">{s.label}</p>
                      <p className="truncate text-[11px] text-zinc-600">{s.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
