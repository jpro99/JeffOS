"use client";

import { useCallback, useRef, useState } from "react";
import type { CostPattern, Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import {
  applyPlanToFeatures,
  approvePlan,
  generateOrchestrationPlan,
} from "@/lib/orchestration/plan";
import { suggestIntegrations } from "@/lib/orchestration/integrations";
import { persistApprovedBuildPrompt } from "@/lib/mission/command-session";
import { CursorBuildPromptPanel } from "@/components/shared/CursorBuildPromptPanel";
import { cn, copyToClipboard } from "@/lib/utils";

export function EasyOrchestratePanel({
  project,
  intent,
}: {
  project: Project;
  intent?: string;
}) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [msg, setMsg] = useState<string | null>(null);
  const [costPattern, setCostPattern] = useState<CostPattern>(
    project.orchestration?.plan?.costPattern ?? "mixed",
  );
  const promptRef = useRef<HTMLDivElement>(null);

  const live = state.projects.find((p) => p.id === project.id) ?? project;
  const orch = live.orchestration;
  if (!orch) return null;

  const resolvedIntent =
    intent?.trim() ||
    orch.scope.pitch ||
    live.description ||
    live.goals.join("; ") ||
    `Build ${live.name}`;

  const save = (next: Project) => {
    updateProject({ ...next, lastUpdated: new Date().toISOString() });
  };

  const patchOrch = (patch: Partial<typeof orch>) => {
    save({ ...live, orchestration: { ...orch, ...patch } });
  };

  const scrollToPrompt = () => {
    requestAnimationFrame(() => {
      promptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const generatePlan = () => {
    if (!orch.features.length) {
      setMsg("Add features first — type what you want above, or use Brainstorm in Classic Scope");
      return;
    }
    const plan = generateOrchestrationPlan(live, state.bots, costPattern);
    const features = applyPlanToFeatures(orch.features, plan, state.bots);
    const integrations =
      orch.integrationSuggestions.length > 0
        ? orch.integrationSuggestions
        : suggestIntegrations(live);
    patchOrch({ plan, features, integrationSuggestions: integrations });
    setMsg("Plan ready — click Approve plan to unlock the Cursor prompt");
    addActivity(`Generated plan: ${live.name}`, "routing", live.id);
  };

  const onApprove = useCallback(async () => {
    if (!orch.plan) {
      setMsg("Generate plan first");
      return;
    }
    const approved = approvePlan(live, state.bots);
    const withPrompt = persistApprovedBuildPrompt(approved, resolvedIntent, state);
    save(withPrompt);
    addActivity("Plan approved — Cursor prompt ready", "project", live.id);

    const text = withPrompt.ops.commandSession?.lastPrompt ?? "";
    const ok = text ? await copyToClipboard(text) : false;
    setMsg(
      ok
        ? "Copied! Paste in Cursor agent chat on your project folder."
        : "Prompt ready below — select all and copy.",
    );
    scrollToPrompt();
  }, [live, orch.plan, resolvedIntent, state, save, addActivity]);

  const openInCursor = async () => {
    if (!live.path) {
      setMsg("No folder path — set path or import from disk");
      return;
    }
    const res = await fetch("/api/projects/open-in-cursor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: live.path }),
    });
    const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
    setMsg(
      data.ok
        ? "Cursor opened — paste the prompt in agent chat (Jeff OS cannot type into Cursor for you)"
        : data.error ?? "Run npm run dev locally to open Cursor from Jeff OS",
    );
  };

  const showPrompt = Boolean(orch.plan?.approved || live.ops.commandSession?.lastPrompt);

  return (
    <section
      id="cursor-build-prompt"
      className="space-y-4 rounded-2xl border border-teal-500/25 bg-teal-500/[0.04] p-5"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500/90">
          Build in Cursor — not in Jeff OS
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Jeff OS plans and assigns bots. <strong className="text-zinc-300">Real code</strong> runs when
          you paste the prompt below into Cursor on{" "}
          <span className="font-mono text-zinc-500">{live.path ?? "your project folder"}</span>.
          Status labels like &quot;Building&quot; here are a checklist — not live compile.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={costPattern}
          onChange={(e) => setCostPattern(e.target.value as CostPattern)}
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-400"
          aria-label="Cost pattern"
        >
          <option value="cheap">Cheap bots</option>
          <option value="mixed">Mixed</option>
          <option value="strong">Strong models</option>
        </select>
        <button
          type="button"
          onClick={generatePlan}
          disabled={!orch.features.length}
          className="rounded-full bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-zinc-100 ring-1 ring-white/10 hover:bg-white/[0.12] disabled:opacity-40"
        >
          1. Generate plan
        </button>
        {orch.plan && !orch.plan.approved && (
          <button
            type="button"
            onClick={() => void onApprove()}
            className="rounded-full bg-teal-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-teal-400"
          >
            2. Approve plan → show prompt
          </button>
        )}
        {orch.plan?.approved && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
            Plan approved
          </span>
        )}
      </div>

      {orch.plan && !orch.plan.approved && (
        <p className="text-xs text-zinc-500">{orch.plan.summary}</p>
      )}

      <div ref={promptRef}>
        {showPrompt ? (
          <CursorBuildPromptPanel project={live} state={state} intent={resolvedIntent} />
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-zinc-500">
            Generate plan → Approve plan — your full Cursor command appears here.
          </p>
        )}
      </div>

      {showPrompt && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void copyToClipboard(live.ops.commandSession?.lastPrompt ?? "").then((ok) =>
                setMsg(ok ? "Copied again" : "Copy failed — select text in box"),
              )
            }
            className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs font-medium text-teal-200"
          >
            Copy prompt again
          </button>
          {live.path && (
            <button
              type="button"
              onClick={() => void openInCursor()}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Open project in Cursor
            </button>
          )}
        </div>
      )}

      <p className={cn("text-[10px] text-zinc-600")}>
        Jeff OS cannot run Cursor&apos;s agent or embed Cursor&apos;s terminal from the browser. Use Copy
        → paste in Cursor, or Open project in Cursor (localhost only) then paste.
      </p>

      {msg && <p className="text-sm text-teal-400">{msg}</p>}
    </section>
  );
}
