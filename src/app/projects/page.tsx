"use client";

import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/workspace/ScoreRing";
import { ProjectDiscoveryPanel } from "@/components/projects/ProjectDiscoveryPanel";
import { readinessColor } from "@/lib/intelligence/commands";
import { priorityColors, statusColors } from "@/lib/utils";

export default function ProjectsPage() {
  const { state, openWorkspace } = useMissionControl();

  const sorted = [...state.projects].sort((a, b) => {
    const pinA = state.workspace.pinnedProjectIds.includes(a.id) ? 0 : 1;
    const pinB = state.workspace.pinnedProjectIds.includes(b.id) ? 0 : 1;
    if (pinA !== pinB) return pinA - pinB;
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const pa = priorityOrder[a.priority] ?? 9;
    const pb = priorityOrder[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return b.ops.readinessScore - a.ops.readinessScore;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Projects</h1>
          <p className="mt-1 text-zinc-500">
            Your full portfolio from disk — tap any project to enter its operating room.
          </p>
        </div>
        <Link
          href="/easy/new"
          className="rounded-full bg-teal-500/15 px-5 py-2.5 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25"
        >
          + New application
        </Link>
      </div>

      <ProjectDiscoveryPanel />

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            onClick={() => openWorkspace(project.id)}
          >
            <Card className="flex h-full flex-col hover:border-teal-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{project.name}</CardTitle>
                  <p className="mt-1 truncate text-xs text-zinc-600">{project.ops.buildPhase}</p>
                  {project.path && (
                    <p className="mt-1 truncate font-mono text-[10px] text-zinc-700">{project.path}</p>
                  )}
                </div>
                <ScoreRing value={project.ops.readinessScore} label="" size="sm" />
              </div>

              <p className="mt-3 line-clamp-2 flex-1 text-sm text-zinc-500">{project.ops.plainSummary}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className={readinessColor(project.ops.readinessLevel)}>
                  {project.ops.readinessLevel.replace(/-/g, " ")}
                </Badge>
                <Badge className={priorityColors[project.priority]}>{project.priority}</Badge>
                <Badge className={statusColors[project.status]}>{project.status}</Badge>
                {project.pathExists === false && (
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">path missing</Badge>
                )}
                {project.discoverySource === "scan" && (
                  <Badge className="border-violet-500/20 bg-violet-500/10 text-violet-400">discovered</Badge>
                )}
              </div>

              <div className="mt-4 border-t border-white/[0.04] pt-3">
                <p className="text-xs text-teal-700">Next: {project.ops.nextAction.title}</p>
                {project.ops.errors.length > 0 && (
                  <p className="mt-1 text-xs text-rose-400/80">
                    {project.ops.errors.length} error(s) — tap to fix
                  </p>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
