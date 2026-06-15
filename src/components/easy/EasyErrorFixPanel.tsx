"use client";

import { useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import {
  allIncludedStepsDone,
  buildErrorFixBundle,
  countFixableIssues,
  generateErrorFixPlan,
  groupStepsByIssue,
  markFixStepDone,
  resetErrorFixMission,
  selectedSteps,
  toggleIssueIncluded,
  toggleStepIncluded,
} from "@/lib/mission/error-fix";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";
import { cn, copyToClipboard } from "@/lib/utils";
import { CopyButton } from "@/components/ui/CopyButton";

const PHASE_LABEL: Record<string, string> = {
  debug: "Debug",
  fix: "Fix",
  test: "Test",
  security: "Security",
};

export function EasyErrorFixPanel({
  project,
  onVerifiedComplete,
}: {
  project: Project;
  onVerifiedComplete?: () => void;
}) {
  const { state, updateProject, addActivity } = useMissionControl();
  const [msg, setMsg] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [copyOk, setCopyOk] = useState<boolean | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [verifyReport, setVerifyReport] = useState<VerifyReport | null>(null);
  const promptPanelRef = useRef<HTMLDivElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fixable = countFixableIssues(project);
  const mission = project.ops.errorFixMission;
  const groups = useMemo(() => groupStepsByIssue(mission?.steps ?? []), [mission?.steps]);
  const selected = mission ? selectedSteps(mission) : [];
  const isComplete = mission?.status === "complete";
  const promptSent = Boolean(mission?.lastPrompt && mission.status === "running");

  if (fixable === 0 && !isComplete) return null;

  const saveMission = (next: NonNullable<typeof mission>) => {
    updateProject({
      ...project,
      ops: { ...project.ops, errorFixMission: next },
    });
  };

  const planFix = () => {
    const plan = generateErrorFixPlan(project, state.bots);
    saveMission(plan);
    setMsg(`${plan.steps.length} robot steps — check boxes → Build fix prompt`);
    addActivity(`Planned error fix mission: ${project.name}`, "project", project.id);
  };

  const toggleInclude = (stepId: string) => {
    if (!mission) return;
    saveMission(toggleStepIncluded(mission, stepId));
  };

  const toggleIssue = (sourceId: string) => {
    if (!mission) return;
    saveMission(toggleIssueIncluded(mission, sourceId));
  };

  const buildPrompt = (tryCopy: boolean) => {
    let plan = mission;
    if (!plan || plan.steps.length === 0) {
      plan = generateErrorFixPlan(project, state.bots);
      saveMission(plan);
    }

    const bundle = buildErrorFixBundle(project, plan, state);
    if (!bundle) {
      setPromptText("");
      setMsg("Check at least one step to fix");
      setCopyOk(null);
      return;
    }

    setPromptText(bundle);
    setCopyOk(null);

    const running = {
      ...plan,
      status: "running" as const,
      startedAt: new Date().toISOString(),
      lastPrompt: bundle,
    };
    saveMission(running);

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
            ? `Copied ${selectedSteps(plan!).length} steps — paste in Cursor chat`
            : "Prompt shown below — select all & copy (Ctrl+C), or use Copy button",
        );
        if (ok) addActivity(`Copied fix prompt for ${project.name}`, "routing", project.id);
      });
    } else {
      setMsg("Prompt ready below — copy or print");
    }
  };

  const printPrompt = () => {
    const text = promptText || mission?.lastPrompt || "";
    if (!text) {
      buildPrompt(false);
      return;
    }
    const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!w) {
      setMsg("Pop-up blocked — use Copy or select text below");
      return;
    }
    w.document.write(`<!DOCTYPE html><html><head><title>Fix prompt — ${project.name}</title>
<style>body{font-family:ui-monospace,monospace;font-size:12px;line-height:1.45;padding:24px;white-space:pre-wrap;}</style></head>
<body>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const markAgentDone = (stepId: string) => {
    if (!mission) return;
    const next = markFixStepDone(mission, stepId);
    saveMission(next);
    if (allIncludedStepsDone(next)) {
      setMsg("Steps marked — run Recheck project to confirm build passes");
    }
  };

  const verifyAllCompleted = async () => {
    if (!project.path) {
      setMsg("No project folder path — link project on disk first");
      return;
    }

    setRechecking(true);
    setVerifyReport(null);
    setMsg("Running npm build on disk… may take 1–3 min");

    try {
      const res = await fetch("/api/projects/scan-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, verify: true }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        updatedOps?: Project["ops"];
        report?: VerifyReport;
        error?: string;
      };

      if (!data.ok || !data.updatedOps || !data.report) {
        setMsg(data.error ?? "Recheck failed — run npm run dev locally");
        return;
      }

      updateProject({ ...project, ops: data.updatedOps });
      setVerifyReport(data.report);

      if (data.report.canAdvance) {
        setMsg("All clear — build passed. Build next.");
        addActivity(`Fix verify passed: ${project.name}`, "project", project.id);
        requestAnimationFrame(() => onVerifiedComplete?.());
      } else {
        const nextProblem =
          data.report.stillOpenErrors[0]?.title ||
          data.report.stillOpenBlockers[0] ||
          data.report.summary;
        setMsg(`Next problem: ${nextProblem}`);
        addActivity(`Fix verify still blocked: ${project.name}`, "project", project.id);
      }
    } catch {
      setMsg("Recheck failed — is dev server running?");
    } finally {
      setRechecking(false);
    }
  };

  const replanFix = () => {
    const live = state.projects.find((p) => p.id === project.id) ?? project;
    const plan = resetErrorFixMission(live, state.bots);
    saveMission(plan);
    setPromptText("");
    setVerifyReport(null);
    setMsg(`${plan.steps.length} robot steps for what's still broken`);
    addActivity(`Replanned fix mission: ${project.name}`, "project", project.id);
  };

  return (
    <section
      id="fix-errors-panel"
      className="space-y-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5"
    >
      {isComplete ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center">
          <p className="text-lg font-semibold text-emerald-300">Fixed — build next</p>
          <p className="mt-1 text-sm text-emerald-600/80">
            Errors cleared in Jeff OS. Run app + tests locally to double-check.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
              Fix errors before shipping
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              ✓ check steps → Build prompt → paste in Cursor → Update / recheck project
            </p>
          </div>

          {!mission && (
            <button
              type="button"
              onClick={planFix}
              className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm text-zinc-200"
            >
              Plan fix robots
            </button>
          )}

          {groups.length > 0 && (
            <div className="space-y-4">
              <p className="text-[10px] uppercase text-zinc-600">
                Check steps to include ({selected.length} selected)
              </p>
              {groups.map((group) => {
                const issueOn = group.steps.every((s) => s.included !== false);
                return (
                  <div key={group.sourceId} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                    <button
                      type="button"
                      onClick={() => toggleIssue(group.sourceId)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs ring-1",
                          issueOn
                            ? "bg-teal-500/20 text-teal-300 ring-teal-500/30"
                            : "bg-white/[0.04] text-zinc-600 ring-white/10",
                        )}
                      >
                        {issueOn ? "✓" : ""}
                      </span>
                      <span className="text-sm font-medium text-zinc-200">{group.title}</span>
                    </button>
                    <ul className="mt-3 space-y-2 pl-2">
                      {group.steps.map((step) => (
                        <li key={step.id} className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleInclude(step.id)}
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ring-1 transition",
                              step.included !== false
                                ? "bg-teal-500/20 text-teal-300 ring-teal-500/40"
                                : "bg-white/[0.04] text-zinc-600 ring-white/10 hover:ring-white/20",
                            )}
                          >
                            {step.included !== false ? "✓" : ""}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-zinc-300">
                              <span className="text-zinc-500">{step.botName}</span> ·{" "}
                              {PHASE_LABEL[step.phase] ?? step.phase}
                            </p>
                            <p className="text-xs text-zinc-500">{step.summary}</p>
                            {mission?.status === "running" && step.included !== false && (
                              <button
                                type="button"
                                onClick={() => markAgentDone(step.id)}
                                disabled={step.status === "done"}
                                className="mt-1 text-[10px] text-emerald-600 hover:underline disabled:opacity-40"
                              >
                                {step.status === "done" ? "Agent done ✓" : "Mark agent done"}
                              </button>
                            )}
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
                className="flex-1 rounded-full bg-rose-500 py-3.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-40"
              >
                Build & copy fix prompt ({selected.length} steps)
              </button>
              <button
                type="button"
                onClick={() => buildPrompt(false)}
                disabled={selected.length === 0}
                className="rounded-full border border-white/10 px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Show only
              </button>
            </div>
          )}

          {(promptText || mission?.lastPrompt) && (
            <div
              ref={promptPanelRef}
              className="space-y-3 rounded-xl border border-teal-500/25 bg-black/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-teal-300">Your Cursor command — full prompt</p>
                <div className="flex flex-wrap gap-2">
                  <CopyButton
                    text={promptText || mission?.lastPrompt || ""}
                    label="Copy"
                    compact
                  />
                  <button
                    type="button"
                    onClick={printPrompt}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:border-teal-500/30 hover:text-teal-200"
                  >
                    Print
                  </button>
                </div>
              </div>
              {copyOk === false && (
                <p className="text-xs text-amber-400">
                  Auto-copy blocked — text selected below. Press Ctrl+C (Cmd+C on Mac).
                </p>
              )}
              {copyOk === true && (
                <p className="text-xs text-emerald-400">Copied to clipboard — paste in Cursor now.</p>
              )}
              <textarea
                ref={promptTextareaRef}
                readOnly
                value={promptText || mission?.lastPrompt || ""}
                rows={16}
                className="w-full resize-y rounded-lg border border-white/10 bg-[#0a0b0e] px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300"
                onFocus={(e) => e.target.select()}
              />
              <p className="text-[10px] text-zinc-600">
                Click box → Ctrl+A → Ctrl+C if Copy button fails. Includes Control Tower, God Bot, caveman,
                each bot step.
              </p>
            </div>
          )}

          {promptSent && (
            <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
              <p className="text-sm text-zinc-300">
                Cursor done? Jeff runs <strong className="font-medium text-emerald-300">npm run build</strong>{" "}
                on your project folder to see if errors are really fixed.
              </p>
              <button
                type="button"
                onClick={() => void verifyAllCompleted()}
                disabled={rechecking}
                className="w-full rounded-full bg-emerald-500 py-3.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
              >
                {rechecking ? "Checking updates…" : "Update / recheck project"}
              </button>
            </div>
          )}

          {verifyReport && (
            <div
              className={cn(
                "space-y-3 rounded-xl border p-4",
                verifyReport.canAdvance
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/[0.06]",
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold",
                  verifyReport.canAdvance ? "text-emerald-300" : "text-amber-200",
                )}
              >
                {verifyReport.canAdvance ? "Fixed — build passed. Build next." : "Still blocked — next problem"}
              </p>
              <p className="text-xs text-zinc-400">{verifyReport.summary}</p>
              <div className="flex flex-wrap gap-2 text-[10px] uppercase">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    verifyReport.buildPassed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300",
                  )}
                >
                  Build {verifyReport.buildPassed ? "pass" : "fail"}
                </span>
                {verifyReport.lintPassed !== null && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5",
                      verifyReport.lintPassed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300",
                    )}
                  >
                    Lint {verifyReport.lintPassed ? "pass" : "fail"}
                  </span>
                )}
              </div>
              {verifyReport.resolvedTitles.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase text-emerald-700">Cleared after verify</p>
                  <ul className="mt-1 space-y-0.5">
                    {verifyReport.resolvedTitles.map((t) => (
                      <li key={t} className="text-xs text-emerald-400/90">
                        ✓ {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(verifyReport.stillOpenErrors.length > 0 || verifyReport.stillOpenBlockers.length > 0) && (
                <div>
                  <p className="text-[10px] uppercase text-amber-700">Still need fixing</p>
                  <ul className="mt-1 space-y-0.5">
                    {verifyReport.stillOpenBlockers.map((b) => (
                      <li key={b} className="text-xs text-amber-200/90">
                        · {b}
                      </li>
                    ))}
                    {verifyReport.stillOpenErrors.map((e) => (
                      <li key={e.id} className="text-xs text-amber-200/90">
                        · {e.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!verifyReport.canAdvance && verifyReport.buildLogTail && !verifyReport.buildPassed && (
                <div>
                  <p className="text-[10px] uppercase text-zinc-600">Build log (tail)</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-black/50 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">
                    {verifyReport.buildLogTail}
                  </pre>
                </div>
              )}
              {!verifyReport.canAdvance && (
                <button
                  type="button"
                  onClick={replanFix}
                  className="w-full rounded-full border border-white/10 bg-white/[0.05] py-2.5 text-sm text-zinc-200 hover:border-teal-500/30"
                >
                  Fix next problem
                </button>
              )}
            </div>
          )}

          {mission && allIncludedStepsDone(mission) && mission.status !== "complete" && !promptSent && (
            <button
              type="button"
              onClick={() => void verifyAllCompleted()}
              disabled={rechecking}
              className="w-full rounded-full bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              Update / recheck project
            </button>
          )}
        </>
      )}

      {isComplete && (
        <button
          type="button"
          onClick={() => onVerifiedComplete?.()}
          className="w-full rounded-full border border-emerald-500/30 bg-emerald-500/10 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
        >
          Continue to next step →
        </button>
      )}

      {msg && !isComplete && (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-center text-sm",
            copyOk === false ? "bg-amber-500/10 text-amber-300" : "text-teal-500",
          )}
        >
          {msg}
        </p>
      )}
    </section>
  );
}

export function BlockedStatusButton({
  label,
  status,
  className,
  onClick,
}: {
  label: string;
  status: string;
  className?: string;
  onClick?: () => void;
}) {
  if (status !== "blocked") {
    return <span className={className}>{label}</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
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
