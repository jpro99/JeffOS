"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMissionControl, useWorkspace } from "@/lib/store/context";
import { Badge } from "@/components/ui/Badge";
import { RoutingRecommendation } from "@/components/routing/RoutingRecommendation";
import { ProjectSwitcher } from "@/components/os/ProjectSwitcher";
import { TaskQueue } from "@/components/os/TaskQueue";
import { ProjectDiscoveryPanel } from "@/components/projects/ProjectDiscoveryPanel";
import { QuickCommands } from "@/components/workspace/QuickCommands";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useVoice } from "@/components/voice/VoiceProvider";
import { ScoreRing } from "@/components/workspace/ScoreRing";
import { NextActionPanel } from "@/components/workspace/NextActionPanel";
import { priorityColors } from "@/lib/utils";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { readinessColor } from "@/lib/intelligence/commands";
import { StartHerePanel } from "@/components/workspace/StartHerePanel";
import { quickLaunchPrompt } from "@/lib/routing/prompts";

interface OsHomeProps {
  onCommand: () => void;
}

export function OsHome({ onCommand }: OsHomeProps) {
  const router = useRouter();
  const { state, activeProject, getBot, addActivity, recomputeActiveRoute, switchProject, openWorkspace } = useMissionControl();
  const { activeRoute, routeMode, activeTask } = useWorkspace();
  const { openPanel: openVoicePanel } = useVoice();

  const openTasks = state.tasks.filter((t) => t.status !== "done");
  const godBot = activeProject ? getBot(activeProject.assignedGodBotId) : undefined;

  const quickActions = [
    { label: "Easy Mode", href: "/easy", primary: true },
    ...(state.settings.experienceLevel !== "new"
      ? [
          { label: "Tasks", href: "/tasks" },
          { label: "Bots", href: "/bots" },
        ]
      : []),
    ...(state.settings.experienceLevel === "expert"
      ? [
          { label: "Compose", href: "/prompt-builder" },
          { label: "Route", href: "/routing" },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-8">
      <StartHerePanel />
      {/* Hero — calm, Apple-simple */}
      <section className="space-y-6 pt-2">
        <div>
          <p className="text-sm text-zinc-500">Good to go, Jeff.</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
            {activeProject?.name ?? "Jeff OS"}
          </h1>
          <p className="mt-2 max-w-lg text-zinc-500">
            Cursor home base. Best interface, bot, and model — picked for you.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ProjectSwitcher />
          <VoiceMicButton compact />
          <button
            type="button"
            onClick={openVoicePanel}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-zinc-500 hover:bg-white/[0.03]"
          >
            Voice panel
          </button>
          <button
            type="button"
            onClick={onCommand}
            className="flex flex-1 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-500 transition hover:bg-white/[0.05] sm:max-w-md"
          >
            <span className="text-zinc-600">⌘</span>
            <span>Search or run command…</span>
            <kbd className="ml-auto hidden rounded-md bg-black/30 px-2 py-0.5 text-[10px] sm:inline">⌘K</kbd>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={
                a.primary
                  ? "rounded-full bg-teal-500/15 px-5 py-2 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25"
                  : "rounded-full border border-white/[0.06] px-5 py-2 text-sm text-zinc-400 hover:bg-white/[0.03]"
              }
            >
              {a.label}
            </Link>
          ))}
          {activeProject && godBot && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(quickLaunchPrompt(activeProject, godBot, "god-bot"));
                addActivity("Copied God Bot from Home", "bot", activeProject.id);
              }}
              className="rounded-full border border-teal-500/20 px-5 py-2 text-sm text-teal-400"
            >
              Copy God Bot
            </button>
          )}
        </div>
      </section>

      {/* Active route — centerpiece */}
      <ProjectDiscoveryPanel compact />

      {activeProject && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <ScoreRing value={activeProject.ops.readinessScore} label="Ready" />
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap gap-2">
                <Badge className={readinessColor(activeProject.ops.readinessLevel)}>
                  {activeProject.ops.readinessLevel.replace(/-/g, " ")}
                </Badge>
                <Badge className={priorityColors[activeProject.priority]}>{activeProject.priority}</Badge>
              </div>
              <p className="text-sm text-zinc-500">{activeProject.ops.plainSummary}</p>
              {state.workspace.handoffNote && (
                <p className="text-xs text-amber-500/80">Handoff: {state.workspace.handoffNote}</p>
              )}
            </div>
          </div>
          <QuickCommands project={activeProject} compact />
        </section>
      )}

      {activeRoute ? (
        <section>
          <RoutingRecommendation decision={activeRoute} mode={routeMode} />
        </section>
      ) : (
        <button
          type="button"
          onClick={recomputeActiveRoute}
          className="w-full rounded-2xl border border-dashed border-white/10 py-8 text-sm text-zinc-500 hover:border-teal-500/30"
        >
          Tap to compute route for workspace
        </button>
      )}

      {/* Two column — queue + next action */}
      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-sm font-medium text-zinc-400">Task queue</h2>
          <TaskQueue limit={5} />
          {activeTask && (
            <p className="mt-3 text-xs text-zinc-600">
              Focused: <span className="text-zinc-400">{activeTask.title}</span>
            </p>
          )}
        </div>

        <div>
          {activeProject ? (
            <NextActionPanel project={activeProject} />
          ) : (
            <p className="text-sm text-zinc-600">Pick a workspace above.</p>
          )}
        </div>
      </section>

      {/* Legacy project memory — quick link */}
      {activeProject && (
        <section>
          <button
            type="button"
            onClick={() => {
              openWorkspace(activeProject.id);
              router.push(`/projects/${activeProject.id}`);
            }}
            className="text-sm text-teal-500 hover:text-teal-400"
          >
            Enter {activeProject.name} operating room →
          </button>
        </section>
      )}

      {/* Projects strip — switch fast */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-zinc-400">Switch project</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {state.projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                switchProject(p.id);
                router.push(`/projects/${p.id}`);
              }}
              className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition ${
                p.id === activeProject?.id
                  ? "border-teal-500/30 bg-teal-500/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <p className="text-sm font-medium text-zinc-200">{p.name}</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                {p.ops.readinessScore}% · {p.ops.readinessLevel.replace(/-/g, " ")}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recent activity — minimal */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Recent</h2>
        <div className="space-y-1">
          {state.activity.slice(0, 5).map((a) => (
            <div key={a.id} className="flex gap-3 py-2 text-sm">
              <RelativeTime iso={a.createdAt} className="shrink-0 text-zinc-700" />
              <span className="text-zinc-500">{a.message}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats — subtle */}
      <section className="grid grid-cols-3 gap-4 border-t border-white/[0.04] pt-8">
        {[
          { n: state.projects.length, l: "Projects" },
          { n: openTasks.length, l: "Open" },
          { n: state.bots.length, l: "Bots" },
        ].map((s) => (
          <div key={s.l} className="text-center">
            <p className="text-2xl font-light text-zinc-300">{s.n}</p>
            <p className="text-xs text-zinc-600">{s.l}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
