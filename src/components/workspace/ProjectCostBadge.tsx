"use client";

import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { costAlertClasses, getCostAlertLevel, sumProjectCost } from "@/lib/connections/helpers";
import { cn } from "@/lib/utils";

interface ProjectCostBadgeProps {
  project?: Project;
  compact?: boolean;
  className?: string;
}

/** Corner badge — monthly cost + threshold color */
export function ProjectCostBadge({ project, compact, className }: ProjectCostBadgeProps) {
  const { state } = useMissionControl();
  const target = project ?? state.projects.find((p) => p.id === state.workspace.activeProjectId);

  if (!target) return null;

  const monthly = sumProjectCost(target);
  const threshold = state.settings.monthlyCostThresholdUsd;
  const warnPct = state.settings.costWarningPercent;
  const alert = getCostAlertLevel(monthly, threshold, warnPct);

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums",
          costAlertClasses(alert),
          className,
        )}
        title={`${target.name} · limit $${threshold}/mo`}
      >
        ${monthly.toFixed(0)}/mo
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-right",
        costAlertClasses(alert),
        className,
      )}
      title={`Threshold $${threshold}/mo · yellow at ${warnPct}%`}
    >
      <p className="text-[10px] uppercase tracking-wider opacity-75">{target.name.split(" ")[0]}</p>
      <p className="text-lg font-semibold tabular-nums">${monthly.toFixed(0)}</p>
      <p className="text-[10px] opacity-70">per month · cap ${threshold}</p>
    </div>
  );
}
