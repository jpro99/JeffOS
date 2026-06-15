"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Project, ProjectFeature } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import {
  applyPlanToFeatures,
  generateOrchestrationPlan,
} from "@/lib/orchestration/plan";
import { suggestIntegrations } from "@/lib/orchestration/integrations";
import { featuresFromIntent } from "@/lib/mission/intent";
import { flattenMissionSteps } from "@/lib/mission/bundle";
import { EasyProjectBrief } from "@/components/easy/EasyProjectBrief";
import { EasyShipPanel } from "@/components/easy/EasyShipPanel";
import { EasyOrchestratePanel } from "@/components/easy/EasyOrchestratePanel";
import { botPhaseLabel } from "@/lib/ui/experience";
import { cn } from "@/lib/utils";

export function EasyProjectMission({ project }: { project: Project }) {
  const { state, updateProject, addActivity, switchProject } = useMissionControl();
  const [intent, setIntent] = useState(project.orchestration?.scope.pitch ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const nextSectionRef = useRef<HTMLElement>(null);

  const live = state.projects.find((p) => p.id === project.id) ?? project;
  const orch = live.orchestration;
  const steps = useMemo(() => flattenMissionSteps(live), [live]);

  const buildPlannedProject = (): Project | null => {
    if (!intent.trim() || !orch) return null;

    const newFeatures = featuresFromIntent(intent);
    const mergedFeatures = [...orch.features];
    for (const nf of newFeatures) {
      const dupe = mergedFeatures.some(
        (f) => f.name.toLowerCase() === nf.name.toLowerCase(),
      );
      if (!dupe) mergedFeatures.push(nf);
    }

    const draft: Project = {
      ...live,
      orchestration: {
        ...orch,
        scope: { ...orch.scope, pitch: intent.trim(), updatedAt: new Date().toISOString() },
        features: mergedFeatures,
      },
    };

    const costPattern = state.settings.experienceLevel === "expert" ? "mixed" : "cheap";
    const plan = generateOrchestrationPlan(draft, state.bots, costPattern);
    const features = applyPlanToFeatures(mergedFeatures, plan, state.bots);
    const integrations =
      orch.integrationSuggestions.length > 0
        ? orch.integrationSuggestions
        : suggestIntegrations(draft);

    return {
      ...draft,
      orchestration: {
        ...draft.orchestration!,
        plan,
        features,
        integrationSuggestions: integrations,
      },
    };
  };

  const addIntentToScope = () => {
    const planned = buildPlannedProject();
    if (!planned) {
      setMsg("Type what you want first");
      return;
    }
    updateProject(planned);
    switchProject(project.id);
    setMsg("Scope updated — now Generate plan → Approve plan below");
    addActivity(`Easy Mode: scoped mission for ${project.name}`, "project", project.id);
  };

  const markStepDone = (featureId: string, stepPhase: string) => {
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
    updateProject({
      ...live,
      orchestration: { ...orch, features },
    });
    addActivity(`Marked step done: ${stepPhase}`, "project", project.id);
  };

  const openFolder = async () => {
    if (!live.path) {
      setMsg("No folder path on this project");
      return;
    }
    const res = await fetch("/api/projects/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: live.path }),
    });
    const data = (await res.json()) as { ok: boolean };
    setMsg(data.ok ? "Opened project folder" : "Run npm run dev locally");
  };

  const botCards =
    live.orchestration?.plan?.botAssignments.map((a) => {
      const names = a.featureIds
        .map((id) => live.orchestration?.features.find((f) => f.id === id)?.name)
        .filter(Boolean);
      return { ...a, featureNames: names };
    }) ?? [];

  const doneCount = steps.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/easy/projects" className="text-sm text-zinc-600 hover:text-teal-500">
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">{live.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{live.ops.plainSummary}</p>
      </div>

      <EasyProjectBrief
        project={live}
        onFixComplete={() => {
          nextSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <EasyShipPanel project={live} />

      {/* What I want next */}
      <section
        ref={nextSectionRef}
        id="what-i-want-next"
        className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          What I want next
        </p>
        <p className="text-xs text-zinc-600">
          Read snapshot above — then say the next move in plain words.
        </p>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={4}
          placeholder='Example: Fix map crash on mobile and add share trip link'
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700"
        />
        {live.path && (
          <button
            type="button"
            onClick={() => void openFolder()}
            className="text-xs text-teal-500 hover:underline"
          >
            📁 Open project folder
          </button>
        )}
      </section>

      {/* Scope from intent */}
      <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Add to scope
        </p>
        <p className="text-sm text-zinc-500">
          Turns your sentence into features — then Generate plan → Approve → copy Cursor prompt below.
        </p>
        <button
          type="button"
          onClick={addIntentToScope}
          className="rounded-full bg-white/[0.08] px-6 py-3 text-sm font-medium text-zinc-100 ring-1 ring-white/10 hover:bg-white/[0.12]"
        >
          Add to scope from above
        </button>

        {botCards.length > 0 && (
          <ul className="space-y-2 pt-2">
            {botCards.map((card) => (
              <li
                key={card.botType}
                className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
              >
                <p className="text-sm font-medium text-zinc-200">{card.role}</p>
                <p className="text-xs text-zinc-500">
                  {botPhaseLabel(card.botType.replace(/-risk-bot$/, "").replace(/-bot$/, ""))} bot
                </p>
                <p className="mt-1 text-xs text-teal-700/80">
                  → {card.featureNames.join(", ") || "features"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EasyOrchestratePanel project={live} intent={intent} />

      {/* Step 4 — checklist */}
      {steps.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-white/[0.08] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Mark done
            </p>
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

      {state.settings.experienceLevel === "expert" && (
        <Link
          href={`/projects/${project.id}?tab=scope`}
          className="block text-center text-xs text-zinc-600 hover:text-teal-500"
        >
          Open full Scope & Orchestra in Classic →
        </Link>
      )}

      {msg && <p className="text-center text-sm text-teal-500">{msg}</p>}
    </div>
  );
}
