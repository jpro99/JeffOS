"use client";

import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { costAlertClasses, getCostAlertLevel, sumProjectCost } from "@/lib/connections/helpers";
import { buildProjectCostBreakdown } from "@/lib/connections/cost-breakdown";
import { EasyCostBreakdown } from "@/components/easy/EasyCostBreakdown";
import { cn } from "@/lib/utils";

interface ProjectCostBadgeProps {
  project?: Project;
  compact?: boolean;
  className?: string;
  /** Tap badge → expand full breakdown */
  expandable?: boolean;
}

/** Corner badge — monthly cost + threshold color */
export function ProjectCostBadge({
  project,
  compact,
  className,
  expandable = false,
}: ProjectCostBadgeProps) {
  const { state } = useMissionControl();
  const target = project ?? state.projects.find((p) => p.id === state.workspace.activeProjectId);

  if (!target) return null;

  const monthly = sumProjectCost(target);
  const threshold = state.settings.monthlyCostThresholdUsd;
  const warnPct = state.settings.costWarningPercent;
  const alert = getCostAlertLevel(monthly, threshold, warnPct);
  const breakdown = buildProjectCostBreakdown(target);

  if (expandable) {
    return (
      <div className={cn("max-w-sm", className)}>
        <EasyCostBreakdown project={target} compact={compact} />
      </div>
    );
  }

  const title = `${breakdown.formula}\n\n${breakdown.honesty}\n\n${breakdown.sharedNote}`;

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums",
          costAlertClasses(alert),
          className,
        )}
        title={title}
      >
        est. ${monthly.toFixed(0)}/mo
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-xl border px-3 py-2 text-right", costAlertClasses(alert), className)}
      title={title}
    >
      <p className="text-[10px] uppercase tracking-wider opacity-75">Est. monthly</p>
      <p className="text-lg font-semibold tabular-nums">${monthly.toFixed(0)}</p>
      <p className="text-[10px] opacity-70">catalog sum · cap ${threshold}</p>
    </div>
  );
}
