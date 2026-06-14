"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useMissionControl } from "@/lib/store/context";
import {
  GUIDED_JOURNEY_STEPS,
  effectiveGuidedStep,
  inferGuidedJourneyStep,
  stepHref,
} from "@/lib/mission/guided-journey";
import { cn } from "@/lib/utils";

export function EasyGuidedJourney() {
  const { state, updateSettings } = useMissionControl();
  const { settings } = state;
  const hidden = settings.guidedJourneyComplete || settings.guidedJourneyDismissed;

  const inferred = inferGuidedJourneyStep(state);
  const current = effectiveGuidedStep(state);
  const activeStep = GUIDED_JOURNEY_STEPS[current] ?? GUIDED_JOURNEY_STEPS[0];
  const projectId = state.workspace.activeProjectId ?? state.projects[0]?.id;
  const actionHref = stepHref(activeStep, projectId);

  useEffect(() => {
    if (inferred > (settings.guidedJourneyStep ?? 0)) {
      updateSettings({ guidedJourneyStep: inferred });
    }
  }, [inferred, settings.guidedJourneyStep, updateSettings]);

  const progress = useMemo(
    () => Math.round(((current + 1) / GUIDED_JOURNEY_STEPS.length) * 100),
    [current],
  );

  if (hidden) return null;

  const markDone = () => {
    const next = Math.min(current + 1, GUIDED_JOURNEY_STEPS.length - 1);
    updateSettings({
      guidedJourneyStep: next,
      guidedJourneyComplete: next >= GUIDED_JOURNEY_STEPS.length - 1,
    });
  };

  return (
    <div className="border-b border-white/[0.06] bg-violet-500/[0.04]">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="rounded-xl border border-violet-500/20 bg-black/30 p-4 ring-1 ring-violet-500/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90">
                Walk to end product · step {current + 1}/{GUIDED_JOURNEY_STEPS.length}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-zinc-100">{activeStep.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{activeStep.body}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {actionHref && (
                <Link
                  href={actionHref}
                  className="rounded-full bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-200 ring-1 ring-violet-500/30 hover:bg-violet-500/30"
                >
                  Go →
                </Link>
              )}
              <button
                type="button"
                onClick={markDone}
                className="rounded-full bg-teal-500/15 px-4 py-2 text-xs font-semibold text-teal-200 ring-1 ring-teal-500/25 hover:bg-teal-500/25"
              >
                Done — next
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ guidedJourneyDismissed: true })}
                className="rounded-full px-3 py-2 text-[10px] text-zinc-600 hover:text-zinc-400"
              >
                Hide
              </button>
            </div>
          </div>

          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ol className="mt-3 flex flex-wrap gap-1.5">
            {GUIDED_JOURNEY_STEPS.map((step, i) => {
              const done = i < current;
              const active = i === current;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-medium ring-1",
                    done && "bg-teal-500/10 text-teal-400/80 ring-teal-500/20",
                    active && "bg-violet-500/20 text-violet-200 ring-violet-500/40",
                    !done && !active && "bg-white/[0.03] text-zinc-600 ring-white/[0.06]",
                  )}
                  title={step.body}
                >
                  {done ? "✓ " : ""}
                  {step.title}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
