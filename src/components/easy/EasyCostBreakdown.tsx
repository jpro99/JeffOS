"use client";

import type { Project } from "@/lib/types";
import { buildProjectCostBreakdown } from "@/lib/connections/cost-breakdown";
import {
  costAlertClasses,
  getCostAlertLevel,
  sumProjectCost,
} from "@/lib/connections/helpers";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";
import { CONNECTION_ICONS } from "@/lib/connections/catalog";

export function EasyCostBreakdown({
  project,
  defaultOpen = false,
  compact = false,
}: {
  project: Project;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const { state } = useMissionControl();
  const breakdown = buildProjectCostBreakdown(project);
  const monthly = sumProjectCost(project);
  const threshold = state.settings.monthlyCostThresholdUsd;
  const warnPct = state.settings.costWarningPercent;
  const alert = getCostAlertLevel(monthly, threshold, warnPct);

  if (breakdown.lines.length === 0 && monthly === 0) {
    return (
      <p className="text-xs text-zinc-600">No monthly cost lines for this project yet.</p>
    );
  }

  return (
    <details
      className={cn("group rounded-xl border", costAlertClasses(alert))}
      open={defaultOpen}
    >
      <summary
        className={cn(
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          compact ? "px-3 py-2" : "px-4 py-3",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-75">
              Est. monthly · tap for breakdown
            </p>
            <p className={cn("font-semibold tabular-nums", compact ? "text-base" : "text-xl")}>
              ${monthly.toFixed(0)}
              <span className="text-sm font-normal opacity-70">/mo</span>
            </p>
          </div>
          <span className="text-[10px] opacity-60 group-open:hidden">Show lines ▼</span>
          <span className="hidden text-[10px] opacity-60 group-open:inline">Hide ▲</span>
        </div>
      </summary>

      <div className="space-y-3 border-t border-white/[0.06] px-4 py-3">
        <p className="text-xs leading-relaxed text-zinc-400">{breakdown.honesty}</p>
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
          {breakdown.sharedNote}
        </p>

        <ul className="space-y-2">
          {breakdown.lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-sm opacity-70">{CONNECTION_ICONS[line.kind] ?? "◇"}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{line.label}</p>
                  <p className="text-[10px] text-zinc-600">
                    {line.billingSource === "manual" ? "You set this" : "Catalog estimate"}
                    {line.description ? ` · ${line.description}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-zinc-100">
                  ${line.amountUsd.toFixed(0)}/mo
                </span>
                {line.dashboardUrl && (
                  <a
                    href={line.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-teal-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Bill ↗
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>

        <p className="font-mono text-[11px] text-zinc-500">{breakdown.formula}</p>
        <p className="text-[10px] text-zinc-600">
          Alert limit ${threshold}/mo · yellow at {warnPct}% — not the same as real spend.
        </p>
      </div>
    </details>
  );
}
