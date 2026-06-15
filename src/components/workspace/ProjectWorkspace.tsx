"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { Badge } from "@/components/ui/Badge";
import { RoutingRecommendation } from "@/components/routing/RoutingRecommendation";
import { ProjectHealthPanel } from "@/components/workspace/ProjectHealthPanel";
import { NextActionPanel } from "@/components/workspace/NextActionPanel";
import { ErrorCommandPanel } from "@/components/workspace/ErrorCommandPanel";
import { ProjectConnectionsPanel } from "@/components/workspace/ProjectConnectionsPanel";
import { ProjectCostBadge } from "@/components/workspace/ProjectCostBadge";
import { GodModePanel } from "@/components/workspace/GodModePanel";
import { QuickCommands } from "@/components/workspace/QuickCommands";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useVoice } from "@/components/voice/VoiceProvider";
import { TaskQueue } from "@/components/os/TaskQueue";
import { readinessColor } from "@/lib/intelligence/commands";
import { computeRouting } from "@/lib/routing/engine";
import { priorityColors, statusColors } from "@/lib/utils";
import type { Project, TaskTypeId } from "@/lib/types";
import { OrchestratorHub } from "@/components/scope/OrchestratorHub";
import { ProjectCommandCenterPanel } from "@/components/workspace/ProjectCommandCenterPanel";
import { ProjectFixHub } from "@/components/shared/ProjectFixHub";
import { ProjectJourneyFlow } from "@/components/journey/ProjectJourneyFlow";
import { getOrchestrationStats } from "@/lib/orchestration/stats";
import { useSearchParams } from "next/navigation";

type Tab = "overview" | "command-center" | "scope" | "connections" | "errors" | "god-mode" | "tasks";

export function ProjectWorkspace({ project }: { project: Project }) {
  const { state, switchProject, minimizeWorkspace, togglePinProject, setHandoffNote, getBot } =
    useMissionControl();
  const [tab, setTab] = useState<Tab>("overview");
  const ops = project.ops;
  const godBot = getBot(project.assignedGodBotId);
  const { openPanel: openVoicePanel } = useVoice();
  const searchParams = useSearchParams();
  const orchStats = getOrchestrationStats(project);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "scope") setTab("scope");
    if (t === "command-center") setTab("command-center");
  }, [searchParams]);

  useEffect(() => {
    switchProject(project.id);
  }, [project.id, switchProject]);

  const route = useMemo(() => {
    return (
      state.workspace.activeRoute ??
      computeRouting({
        taskType: ops.nextAction.taskType as TaskTypeId,
        taskSize: "medium",
        optimizeFor: "quality",
        autonomyLevel: "medium",
        riskLevel: ops.riskLevel,
        costSensitivity: "medium",
        project,
        settings: state.settings,
        presets: state.routingPresets,
        bots: state.bots,
      })
    );
  }, [state, project, ops]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "command-center", label: "Docs" },
    { id: "scope", label: "Scope & Orchestra", badge: orchStats.total || undefined },
    { id: "connections", label: "Connections", badge: project.connections?.length || undefined },
    { id: "errors", label: "Errors", badge: ops.errors.length || undefined },
    { id: "god-mode", label: "God Mode" },
    { id: "tasks", label: "Tasks" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Operating room header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/projects" className="text-sm text-zinc-600 hover:text-teal-500">
              ← All projects
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
              {project.name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">{ops.plainSummary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectCostBadge project={project} />
            <div className="flex flex-wrap gap-2">
            <VoiceMicButton />
            <button
              type="button"
              onClick={openVoicePanel}
              className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-zinc-400 hover:bg-white/[0.03]"
            >
              Voice panel
            </button>
            <Badge className={readinessColor(ops.readinessLevel)}>
              {ops.readinessLevel.replace(/-/g, " ")}
            </Badge>
            <Badge className={priorityColors[project.priority]}>{project.priority}</Badge>
            <Badge className={statusColors[project.status]}>{project.status}</Badge>
            </div>
          </div>
        </div>

        <ProjectJourneyFlow project={project} />

        <QuickCommands project={project} />

        <div className="flex flex-wrap gap-2 border-b border-white/[0.05] pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                tab === t.id ? "bg-white/[0.06] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
              {t.badge ? ` (${t.badge})` : ""}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => togglePinProject(project.id)}
              className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.04]"
            >
              {state.workspace.pinnedProjectIds.includes(project.id) ? "Unpin" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => minimizeWorkspace(project.id)}
              className="rounded-lg px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.04]"
            >
              Minimize
            </button>
          </div>
        </div>
      </header>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <NextActionPanel project={project} />
            <ProjectHealthPanel project={project} />
          </div>
          <div className="space-y-6">
            <RoutingRecommendation decision={route} mode={state.workspace.routeMode} compact />
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase text-zinc-600">God Bot</p>
              <p className="mt-1 text-sm text-zinc-300">{godBot?.name}</p>
              <p className="mt-1 text-xs text-zinc-600">{godBot?.description}</p>
              {project.path && (
                <p className="mt-3 truncate font-mono text-[10px] text-zinc-700">{project.path}</p>
              )}
            </div>
            <TaskQueue limit={4} />
            {state.workspace.handoffNote && (
              <div className="rounded-xl border border-teal-500/15 bg-teal-500/5 p-3">
                <p className="text-[10px] uppercase text-teal-700">Phone → desktop handoff</p>
                <p className="mt-1 text-sm text-zinc-400">{state.workspace.handoffNote}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                setHandoffNote(`Continue ${project.name}: ${ops.nextAction.title}`)
              }
              className="w-full rounded-xl border border-dashed border-white/10 py-2 text-xs text-zinc-500"
            >
              Set handoff note for phone
            </button>
          </div>
        </div>
      )}

      {tab === "command-center" && <ProjectCommandCenterPanel project={project} />}

      {tab === "scope" && project.orchestration && <OrchestratorHub project={project} />}

      {tab === "connections" && <ProjectConnectionsPanel project={project} />}

      {tab === "errors" && <ErrorCommandPanel project={project} />}

      {tab === "god-mode" && <GodModePanel project={project} />}

      {tab === "tasks" && (
        <div className="space-y-4">
          <TaskQueue limit={10} />
          <Link
            href={`/tasks?project=${project.id}`}
            className="inline-block text-sm text-teal-500"
          >
            Open full task board →
          </Link>
        </div>
      )}
    </div>
  );
}
