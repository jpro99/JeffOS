"use client";

import type { Project } from "@/lib/types";
import { healthBarColor, readinessColor } from "@/lib/intelligence/commands";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/workspace/ScoreRing";

export function ProjectHealthPanel({ project }: { project: Project }) {
  const ops = project.ops;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle>Project health</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">{ops.plainSummary}</p>
        </div>
        <Badge className={readinessColor(ops.readinessLevel)}>{ops.readinessLevel.replace(/-/g, " ")}</Badge>
      </div>

      <div className="flex flex-wrap justify-around gap-4 border-y border-white/[0.04] py-5">
        <ScoreRing value={ops.readinessScore} label="Ready" />
        <ScoreRing value={ops.demoReadyScore} label="Demo" size="sm" />
        <ScoreRing value={ops.productionReadyScore} label="Prod" size="sm" />
        <ScoreRing value={ops.launchConfidence} label="Launch" size="sm" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Security", ops.security],
            ["Stability", ops.stability],
            ["Quality", ops.quality],
          ] as const
        ).map(([name, score]) => (
          <div key={name} className="rounded-xl bg-white/[0.02] p-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{name}</span>
              <span>{score.score}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${healthBarColor(score.status)}`}
                style={{ width: `${score.score}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">{score.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Working</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {ops.working.slice(0, 4).map((w) => (
              <li key={w} className="flex gap-2">
                <span className="text-teal-700">✓</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Blocked</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-400">
            {ops.blocked.length === 0 && <li className="text-zinc-600">None</li>}
            {ops.blocked.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-rose-800">!</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">Phase · {ops.buildPhase}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-teal-500/70"
            style={{ width: `${ops.percentComplete}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-600">{ops.percentComplete}% complete</p>
      </div>

      {ops.missingPieces.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Missing pieces</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ops.missingPieces.map((m) => (
              <Badge key={m} className="border-white/10 bg-white/5 text-zinc-500">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {ops.hardeningSteps.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-600">Recommended hardening</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-500">
            {ops.hardeningSteps.map((h) => (
              <li key={h}>→ {h}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
