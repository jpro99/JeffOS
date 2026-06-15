"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { featuresFromIntent } from "@/lib/mission/intent";
import {
  applyPlanToFeatures,
  generateOrchestrationPlan,
} from "@/lib/orchestration/plan";
import { suggestIntegrations } from "@/lib/orchestration/integrations";
import { dispatchPasteFixSeed, scrollToPasteFix } from "@/lib/intelligence/quick-action-guide";
import { analyzePaste, buildPasteFixPrompt } from "@/lib/mission/paste-fix";
import { copyToClipboard } from "@/lib/utils";

export function JourneyBrainstormPanel({ project }: { project: Project }) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [idea, setIdea] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const addIdea = () => {
    if (!idea.trim() || !project.orchestration) {
      setMsg("Type an idea first");
      return;
    }
    const orch = project.orchestration;
    const newFeatures = featuresFromIntent(idea);
    const merged = [...orch.features];
    for (const nf of newFeatures) {
      if (!merged.some((f) => f.name.toLowerCase() === nf.name.toLowerCase())) {
        merged.push(nf);
      }
    }
    const draft = {
      ...project,
      orchestration: {
        ...orch,
        scope: { ...orch.scope, pitch: `${orch.scope.pitch}\n${idea.trim()}`, updatedAt: new Date().toISOString() },
        features: merged,
      },
    };
    const plan = generateOrchestrationPlan(draft, state.bots, "mixed");
    const features = applyPlanToFeatures(merged, plan, state.bots);
    updateProject({
      ...draft,
      orchestration: { ...draft.orchestration!, plan, features, integrationSuggestions: suggestIntegrations(draft) },
    });
    setMsg("Added to scope — go to Build step and approve plan, or Fix if something broke");
    addActivity(`New idea: ${idea.slice(0, 60)}`, "project", project.id);
    setIdea("");
  };

  const fixIdea = async () => {
    if (!idea.trim()) {
      setMsg("Describe what to fix or add");
      return;
    }
    dispatchPasteFixSeed(idea.trim());
    const analysis = analyzePaste(idea.trim(), project);
    const prompt = buildPasteFixPrompt(idea.trim(), project, state, analysis);
    await copyToClipboard(prompt);
    scrollToPasteFix();
    setMsg("Fix prompt copied — paste in Cursor agent");
  };

  return (
    <section
      id="journey-brainstorm"
      className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
        New idea or fix in plain words
      </p>
      <p className="text-xs text-zinc-500">
        Brainstorm below the main flow — add features or describe a bug. Add → scope. Fix → Cursor prompt.
      </p>
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={3}
        placeholder="Example: Add dark mode. Or: Login page throws 500 on submit."
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-700"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addIdea}
          className="rounded-full bg-amber-500/20 px-6 py-2.5 text-sm font-medium text-amber-100 ring-1 ring-amber-500/30 hover:bg-amber-500/30"
        >
          Add to project
        </button>
        <button
          type="button"
          onClick={() => void fixIdea()}
          className="rounded-full bg-rose-500/20 px-6 py-2.5 text-sm font-medium text-rose-200 ring-1 ring-rose-500/30 hover:bg-rose-500/30"
        >
          Fix this
        </button>
      </div>
      {msg && <p className="text-sm text-teal-400">{msg}</p>}
    </section>
  );
}
