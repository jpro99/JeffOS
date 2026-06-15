"use client";

import { useMemo, useState } from "react";
import type { ProjectBrief } from "@/lib/project-scan/brief";
import type { Project } from "@/lib/types";
import {
  buildWhatsNextSuggestions,
  pickWhatsNextSuggestion,
  type WhatsNextSuggestion,
} from "@/lib/mission/whats-next-suggestions";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<WhatsNextSuggestion["source"], string> = {
  "god-mode": "God Mode add-on",
  backlog: "Build queue",
  "next-action": "Recommended next",
  gap: "Live gap",
  prompt: "Your move",
};

export function EasyWhatsNextPanel({
  project,
  brief,
  openProblemCount,
  onBuildSuggestion,
  onAskDirection,
}: {
  project: Project;
  brief: ProjectBrief | null;
  openProblemCount: number;
  onBuildSuggestion: (intent: string, suggestion: WhatsNextSuggestion) => void;
  onAskDirection: () => void;
}) {
  const suggestions = useMemo(
    () => buildWhatsNextSuggestions(project, brief, { openProblemCount }),
    [project, brief, openProblemCount],
  );
  const [index, setIndex] = useState(0);
  const current = pickWhatsNextSuggestion(suggestions, index);
  const hasBuildIntent = Boolean(current.buildIntent.trim());
  const blockedByProblems =
    openProblemCount > 0 && current.source !== "prompt" && current.id !== "help-decide";

  const sourceLabel = SOURCE_LABEL[current.source];
  const moreCount = suggestions.length - 1;

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300/80">
            What&apos;s next
          </p>
          <h2 className="mt-1 text-base font-semibold text-zinc-100">
            {openProblemCount > 0 ? "After problems are fixed" : "Suggested next step"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            God Mode ideas to beat every other product in this space — yes builds it in Cursor, next cycles the list.
          </p>
        </div>
        {moreCount > 0 && (
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] text-violet-200">
            {suggestions.length} suggestions
          </span>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/30 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-teal-600">{sourceLabel}</p>
        <p className="mt-2 text-sm font-semibold text-zinc-100">{current.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{current.detail}</p>
        {current.leverage && (
          <p className="mt-2 text-[10px] text-violet-400/90">{current.leverage} leverage</p>
        )}
        {blockedByProblems && (
          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Fix open problems first (Fix errors), then tap Yes on this suggestion.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={!hasBuildIntent || blockedByProblems}
          onClick={() => onBuildSuggestion(current.buildIntent, current)}
          className={cn(
            "min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold",
            hasBuildIntent && !blockedByProblems
              ? "bg-violet-500 text-white hover:bg-violet-400"
              : "cursor-not-allowed bg-zinc-800 text-zinc-500",
          )}
        >
          Yes, build this
        </button>
        <button
          type="button"
          disabled={suggestions.length <= 1}
          onClick={() => setIndex((i) => i + 1)}
          className="min-h-[44px] flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.04] disabled:opacity-40"
        >
          Next suggestion
        </button>
        <button
          type="button"
          onClick={onAskDirection}
          className="min-h-[44px] rounded-xl border border-teal-500/30 px-4 py-2.5 text-sm text-teal-300 hover:bg-teal-500/10"
        >
          Where should we go?
        </button>
      </div>
    </section>
  );
}
