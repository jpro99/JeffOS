"use client";

import { useState } from "react";
import type { Project, ProjectError } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge } from "@/components/ui/Badge";
import { RoutingRecommendation } from "@/components/routing/RoutingRecommendation";
import { resolveQuickCommand } from "@/lib/intelligence/commands";

function ErrorCard({ error, projectId }: { error: ProjectError; projectId: string }) {
  const { state, runQuickCommand } = useMissionControl();
  const project = state.projects.find((p) => p.id === projectId)!;
  const fix = resolveQuickCommand("fix-next-issue", project, state);

  const sevColor = {
    low: "text-zinc-400 bg-zinc-500/10",
    medium: "text-amber-400 bg-amber-500/10",
    high: "text-orange-400 bg-orange-500/10",
    critical: "text-rose-400 bg-rose-500/10",
  }[error.severity];

  const riskColor = {
    safe: "text-teal-600",
    medium: "text-amber-500",
    high: "text-rose-500",
  }[error.fixRisk];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-zinc-200">{error.title}</p>
        <Badge className={sevColor}>{error.severity}</Badge>
      </div>
      <p className="text-sm text-zinc-500">
        <span className="text-zinc-600">Likely cause:</span> {error.likelyCause}
      </p>
      <p className="text-sm text-zinc-400">{error.recommendedFix}</p>

      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg bg-black/20 p-2">
          <p className="text-zinc-600">About to do</p>
          <p className="mt-1 text-zinc-400">{error.aboutToDo}</p>
        </div>
        <div className="rounded-lg bg-black/20 p-2">
          <p className="text-zinc-600">Why</p>
          <p className="mt-1 text-zinc-400">{error.whyDoingIt}</p>
        </div>
        <div className="rounded-lg bg-black/20 p-2">
          <p className="text-zinc-600">Could go wrong</p>
          <p className="mt-1 text-zinc-400">{error.couldGoWrong}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-600">Confidence {Math.round(error.confidence * 100)}%</span>
        <span className={riskColor}>Fix risk: {error.fixRisk}</span>
      </div>

      <div className="flex gap-2">
        <CopyButton
          text={fix.prompt}
          label="Copy fix prompt"
          compact
        />
        <button
          type="button"
          onClick={() => runQuickCommand(projectId, "fix-next-issue")}
          className="rounded-lg bg-teal-500/15 px-3 py-1 text-xs text-teal-300"
        >
          Route fix
        </button>
      </div>
    </div>
  );
}

export function ErrorCommandPanel({ project }: { project: Project }) {
  const { state } = useMissionControl();
  const errors = project.ops.errors;
  const [showRoute, setShowRoute] = useState(false);
  const fix = resolveQuickCommand("fix-errors", project, state);

  if (errors.length === 0) {
    return (
      <Card>
        <CardTitle>Error command</CardTitle>
        <p className="mt-2 text-sm text-teal-600">No known errors. Clean for now.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle>Error command</CardTitle>
        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-300">{errors.length} issues</Badge>
      </div>

      {errors.map((e) => (
        <ErrorCard key={e.id} error={e} projectId={project.id} />
      ))}

      <button
        type="button"
        onClick={() => setShowRoute(!showRoute)}
        className="text-sm text-teal-500"
      >
        {showRoute ? "Hide" : "Show"} route for fix-all
      </button>
      {showRoute && <RoutingRecommendation decision={fix.routing} />}
    </Card>
  );
}
