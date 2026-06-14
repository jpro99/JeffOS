"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import type { ProjectBrief } from "@/lib/project-scan/brief";
import { useMissionControl } from "@/lib/store/context";
import {
  buildGapFixBundle,
  collectGaps,
  countGaps,
  generateGapFixPlan,
  groupStepsByGap,
  selectedGapSteps,
  toggleGapIncluded,
  toggleGapStepIncluded,
} from "@/lib/mission/gap-fix";
import { cn, copyToClipboard } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";

const PHASE_LABEL: Record<string, string> = {
  plan: "Plan",
  build: "Build",
  test: "Test",
};

const CATEGORY_LABEL: Record<string, string> = {
  "not-built": "Not built",
  "needs-build": "Needs build",
  "still-need": "Still need",
  connection: "Connection",
  missing: "Missing",
  hardening: "Hardening",
};

export function EasyGapsPanel({
  project,
  brief,
  autoPlan = false,
  onRescan,
}: {
  project: Project;
  brief: ProjectBrief;
  autoPlan?: boolean;
  onRescan?: () => void;
}) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [msg, setMsg] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [copyOk, setCopyOk] = useState<boolean | null>(null);
  const promptPanelRef = useRef<HTMLDivElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const projectRef = useRef(project);
  projectRef.current = project;

  const gaps = useMemo(() => collectGaps(brief, project), [brief, project]);
  const mission = project.ops.gapFixMission;
  const groups = useMemo(() => groupStepsByGap(mission?.steps ?? []), [mission?.steps]);
  const selected = mission ? selectedGapSteps(mission) : [];

  useEffect(() => {
    if (!autoPlan || mission?.steps.length) return;
    const plan = generateGapFixPlan(brief, projectRef.current, state.bots);
    if (plan.steps.length === 0) return;
    updateProject({
      ...projectRef.current,
      ops: { ...projectRef.current.ops, gapFixMission: plan },
    });
  }, [autoPlan, brief, mission?.steps.length, state.bots, updateProject]);

  const saveMission = (next: NonNullable<typeof mission>) => {
    updateProject({
      ...project,
      ops: { ...project.ops, gapFixMission: next },
    });
  };

  const planGaps = () => {
    const plan = generateGapFixPlan(brief, project, state.bots);
    saveMission(plan);
    setMsg(`${gaps.length} gaps → ${plan.steps.length} robot steps. Check boxes → Build prompt`);
    addActivity(`Planned gap mission: ${project.name}`, "project", project.id);
  };

  const buildPrompt = (tryCopy: boolean) => {
    let plan = mission;
    if (!plan || plan.steps.length === 0) {
      plan = generateGapFixPlan(brief, project, state.bots);
      saveMission(plan);
    }

    const bundle = buildGapFixBundle(project, plan, state);
    if (!bundle) {
      setMsg("Check at least one gap step to include");
      return;
    }

    setPromptText(bundle);
    setCopyOk(null);
    saveMission({
      ...plan,
      status: "running",
      startedAt: new Date().toISOString(),
      lastPrompt: bundle,
    });

    requestAnimationFrame(() => {
      promptPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      promptTextareaRef.current?.focus();
      promptTextareaRef.current?.select();
    });

    if (tryCopy) {
      void copyToClipboard(bundle).then((ok) => {
        setCopyOk(ok);
        setMsg(
          ok
            ? `Copied — paste in Cursor (open repo: ${project.path ?? "see path above"})`
            : "Prompt below — select all & copy",
        );
        if (ok) addActivity(`Copied gap fix prompt: ${project.name}`, "routing", project.id);
      });
    } else {
      setMsg("Gap prompt ready below");
    }
  };

  if (gaps.length === 0) return null;

  return (
    <section
      id="gaps-panel"
      className="space-y-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
          Close gaps — build what&apos;s missing
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Live gaps from disk scan + verify — not old notes. Check → Build & copy prompt → paste in Cursor on{" "}
          <span className="font-mono text-[11px] text-amber-200/80">{project.path ?? "project folder"}</span>
        </p>
        {project.ops.liveVerify && (
          <p className="mt-1 text-[10px] text-zinc-600">
            Last verify: {project.ops.liveVerify.buildPassed ? "build passed" : "build failed"} ·{" "}
            {project.ops.liveVerify.summary}
          </p>
        )}
      </div>

      <ul className="space-y-1.5 rounded-xl border border-white/[0.06] bg-black/20 p-3">
        {gaps.slice(0, 12).map((g) => (
          <li key={g.id} className="flex gap-2 text-sm text-amber-100/90">
            <span className="shrink-0 text-[10px] uppercase text-amber-700">
              {CATEGORY_LABEL[g.category] ?? g.category}
            </span>
            <span>{g.title}</span>
          </li>
        ))}
        {gaps.length > 12 && (
          <li className="text-xs text-zinc-600">+{gaps.length - 12} more in plan below</li>
        )}
      </ul>

      {!mission && (
        <button
          type="button"
          onClick={planGaps}
          className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm text-zinc-200"
        >
          Plan gap robots ({gaps.length} gaps)
        </button>
      )}

      {groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] uppercase text-zinc-600">
            Check gaps to include ({selected.length} steps selected)
          </p>
          {groups.map((group) => {
            const issueOn = group.steps.every((s) => s.included !== false);
            return (
              <div key={group.gapId} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <button
                  type="button"
                  onClick={() => mission && saveMission(toggleGapIncluded(mission, group.gapId))}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ring-1",
                      issueOn
                        ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                        : "bg-white/[0.04] text-zinc-600 ring-white/10",
                    )}
                  >
                    {issueOn ? "✓" : ""}
                  </span>
                  <span className="text-sm font-medium text-zinc-200">{group.title}</span>
                  <span className="text-[10px] text-zinc-600">
                    {CATEGORY_LABEL[group.category] ?? group.category}
                  </span>
                </button>
                <ul className="mt-3 space-y-2 pl-2">
                  {group.steps.map((step) => (
                    <li key={step.id} className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => mission && saveMission(toggleGapStepIncluded(mission, step.id))}
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-1",
                          step.included !== false
                            ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
                            : "bg-white/[0.04] text-zinc-600 ring-white/10",
                        )}
                      >
                        {step.included !== false ? "✓" : ""}
                      </button>
                      <div>
                        <p className="text-sm text-zinc-300">
                          <span className="text-zinc-500">{step.botName}</span> ·{" "}
                          {PHASE_LABEL[step.phase] ?? step.phase}
                        </p>
                        <p className="text-xs text-zinc-500">{step.summary}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {mission && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => buildPrompt(true)}
            disabled={selected.length === 0}
            className="flex-1 rounded-full bg-amber-500 py-3.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
          >
            Build & copy gap prompt ({selected.length} steps)
          </button>
          <button
            type="button"
            onClick={() => buildPrompt(false)}
            disabled={selected.length === 0}
            className="rounded-full border border-white/10 px-4 py-3 text-sm text-zinc-400"
          >
            Show only
          </button>
        </div>
      )}

      {(promptText || mission?.lastPrompt) && (
        <div
          ref={promptPanelRef}
          className="space-y-3 rounded-xl border border-amber-500/25 bg-black/40 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-300">Gap fix command — paste in Cursor</p>
            <CopyButton text={promptText || mission?.lastPrompt || ""} label="Copy" compact />
          </div>
          {copyOk === false && (
            <p className="text-xs text-amber-400">Copy blocked — select text below and Ctrl+C</p>
          )}
          {copyOk === true && <p className="text-xs text-emerald-400">Copied — paste in Cursor now</p>}
          <textarea
            ref={promptTextareaRef}
            readOnly
            value={promptText || mission?.lastPrompt || ""}
            rows={14}
            className="w-full resize-y rounded-lg border border-white/10 bg-[#0a0b0e] px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300"
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {onRescan && mission?.lastPrompt && (
        <button
          type="button"
          onClick={onRescan}
          className="w-full rounded-full border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm text-amber-200 hover:bg-amber-500/20"
        >
          Rescan snapshot — see if gaps closed
        </button>
      )}

      {msg && (
        <p className="rounded-lg px-3 py-2 text-center text-sm text-amber-400">{msg}</p>
      )}
    </section>
  );
}

export function OperationalStatusButton({
  label,
  status,
  className,
  onBlockedClick,
  onGapsClick,
}: {
  label: string;
  status: string;
  className?: string;
  onBlockedClick?: () => void;
  onGapsClick?: () => void;
}) {
  if (status === "blocked" && onBlockedClick) {
    return (
      <button
        type="button"
        onClick={onBlockedClick}
        className={cn(
          className,
          "cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-rose-400/40",
        )}
        title="Click to fix errors"
      >
        {label} → Fix
      </button>
    );
  }

  if ((status === "partial" || status === "building" || status === "not-built") && onGapsClick) {
    return (
      <button
        type="button"
        onClick={onGapsClick}
        className={cn(
          className,
          "cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-amber-400/40",
        )}
        title="Click to see gaps and copy fix prompt"
      >
        {label} → Gaps
      </button>
    );
  }

  return <span className={className}>{label}</span>;
}

export { countGaps };
