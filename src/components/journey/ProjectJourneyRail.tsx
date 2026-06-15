"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import {
  JOURNEY_STEPS,
  computeJourneyPhase,
  journeyHeadline,
  journeyPhaseIndex,
  type JourneyPhase,
} from "@/lib/mission/project-journey";
import { JEFF_OS_NAME } from "@/lib/jeff-os/branding";
import { cn } from "@/lib/utils";

interface ProjectJourneyRailProps {
  project: Project;
  phase?: JourneyPhase;
  onPhaseChange?: (phase: JourneyPhase) => void;
  onPrimaryAction?: (phase: JourneyPhase) => void;
  primaryBusy?: boolean;
}

export function ProjectJourneyRail({
  project,
  phase: controlledPhase,
  onPhaseChange,
  onPrimaryAction,
  primaryBusy,
}: ProjectJourneyRailProps) {
  const autoPhase = useMemo(() => computeJourneyPhase(project), [project]);
  const [manualPhase, setManualPhase] = useState<JourneyPhase | null>(null);
  const phase = controlledPhase ?? manualPhase ?? autoPhase;
  const idx = journeyPhaseIndex(phase);
  const step = JOURNEY_STEPS[idx] ?? JOURNEY_STEPS[0];

  const setPhase = (p: JourneyPhase) => {
    setManualPhase(p);
    onPhaseChange?.(p);
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-teal-500/20 bg-[#0a0b0e]/95 px-4 py-4 backdrop-blur-xl">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-500/80">
        {JEFF_OS_NAME} — build flow (top to bottom, keep tapping Next)
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-100">{journeyHeadline(phase, project)}</h2>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {JOURNEY_STEPS.map((s, i) => {
          const done = i < idx;
          const active = s.id === phase;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setPhase(s.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition",
                active && "bg-teal-500/25 text-teal-100 ring-1 ring-teal-500/40",
                done && !active && "text-emerald-600/90",
                !done && !active && "text-zinc-600 hover:text-zinc-400",
              )}
            >
              {done && !active ? "✓ " : ""}
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={primaryBusy}
          onClick={() => onPrimaryAction?.(phase)}
          className="min-h-[44px] rounded-full bg-teal-500 px-8 py-3 text-sm font-semibold text-black hover:bg-teal-400 disabled:opacity-50"
        >
          {primaryBusy ? "Working…" : step.verb}
        </button>
        {idx < JOURNEY_STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => setPhase(JOURNEY_STEPS[idx + 1].id)}
            className="min-h-[44px] rounded-full border border-white/10 px-6 py-3 text-sm text-zinc-300 hover:bg-white/[0.04]"
          >
            Skip → {JOURNEY_STEPS[idx + 1].label}
          </button>
        )}
        {idx > 0 && (
          <button
            type="button"
            onClick={() => setPhase(JOURNEY_STEPS[idx - 1].id)}
            className="min-h-[44px] rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-500"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
