"use client";

import type { RoutingDecision } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { getInterfaceLabel, getModelLabel } from "@/lib/routing/engine";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/utils";

interface RoutingRecommendationProps {
  decision: RoutingDecision;
  mode?: "auto" | "manual";
  compact?: boolean;
}

export function RoutingRecommendation({ decision, mode = "auto", compact }: RoutingRecommendationProps) {
  const { state } = useMissionControl();
  const bot = state.bots.find((b) => b.id === decision.botId);

  return (
    <Card glow={mode === "auto"} className={compact ? "p-4" : undefined}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge className="border-teal-500/15 bg-teal-500/8 text-teal-300/90">
          {mode === "auto" ? "Auto" : "Manual"}
        </Badge>
        <Badge className="border-white/[0.06] bg-white/[0.03] text-zinc-500">
          {formatPercent(decision.confidence)}
        </Badge>
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"}`}>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-600">Interface</p>
          <p className="mt-1 font-medium text-zinc-100">
            {getInterfaceLabel(decision.interface, state.interfaces)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-600">Bot</p>
          <p className="mt-1 font-medium text-zinc-100">{bot?.name ?? decision.botType}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-600">Model class</p>
          <p className="mt-1 font-medium text-zinc-100">
            {getModelLabel(decision.modelClass, state.modelClasses)}
          </p>
        </div>
      </div>
      {!compact && decision.reasons.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-white/[0.06] pt-4">
          {decision.reasons.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-zinc-500">
              <span className="text-teal-600">→</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
