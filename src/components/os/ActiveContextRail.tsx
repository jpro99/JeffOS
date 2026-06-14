"use client";

import Link from "next/link";
import { useMissionControl, useWorkspace } from "@/lib/store/context";
import { quickLaunchPrompt } from "@/lib/routing/prompts";
import { CopyButton } from "@/components/ui/CopyButton";
import { ProjectSwitcher } from "@/components/os/ProjectSwitcher";
import { RouteStrip } from "@/components/os/RouteStrip";
import { TaskQueue } from "@/components/os/TaskQueue";
import { QuickCommands } from "@/components/workspace/QuickCommands";
import { ScoreRing } from "@/components/workspace/ScoreRing";
import { readinessColor } from "@/lib/intelligence/commands";
import { Badge } from "@/components/ui/Badge";
import { RelativeTime } from "@/components/ui/RelativeTime";

export function ActiveContextRail() {
  const { state, activeProject, getBot, addActivity } = useMissionControl();
  const { activeTask } = useWorkspace();
  const compact = state.settings.compactMode || state.settings.mobileMode;

  const godBot = activeProject ? getBot(activeProject.assignedGodBotId) : undefined;

  const launch = (kind: "control-tower" | "god-bot") => {
    if (!activeProject) return;
    const text =
      kind === "control-tower"
        ? quickLaunchPrompt(activeProject, state.bots[0], "control-tower")
        : godBot
          ? quickLaunchPrompt(activeProject, godBot, "god-bot")
          : "";
    void navigator.clipboard.writeText(text);
    addActivity(`Launched ${kind}`, "bot", activeProject.id);
  };

  return (
    <aside
      className={
        compact
          ? "border-t border-white/[0.06] bg-[#0e1014]/80 p-4 lg:hidden"
          : "hidden w-80 shrink-0 border-l border-white/[0.06] bg-[#0c0d11]/50 p-5 xl:block"
      }
    >
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">Active context</p>

      {!compact && <ProjectSwitcher />}

      {activeProject && (
        <div className="mt-4 rounded-2xl bg-white/[0.02] p-3">
          <div className="flex items-start gap-3">
            <ScoreRing value={activeProject.ops.readinessScore} label="" size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">{activeProject.name}</p>
              <Badge className={`mt-1 ${readinessColor(activeProject.ops.readinessLevel)}`}>
                {activeProject.ops.readinessLevel.replace(/-/g, " ")}
              </Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-600">{activeProject.ops.nextAction.title}</p>
          {state.workspace.handoffNote && (
            <p className="mt-2 rounded-lg bg-amber-500/5 px-2 py-1 text-xs text-amber-200/80">
              {state.workspace.handoffNote}
            </p>
          )}
          {activeProject.path && (
            <p className="mt-2 truncate font-mono text-[10px] text-zinc-700">{activeProject.path}</p>
          )}
          <div className="mt-3">
            <QuickCommands project={activeProject} compact commands={["continue-build", "fix-errors", "god-mode"]} />
          </div>
        </div>
      )}

      {activeTask && (
        <div className="mt-3 rounded-xl border border-teal-500/15 bg-teal-500/5 p-3">
          <p className="text-[10px] uppercase text-teal-700">Focused task</p>
          <p className="mt-1 text-sm text-zinc-200">{activeTask.title}</p>
        </div>
      )}

      <div className="mt-4">
        <RouteStrip compact={compact} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => launch("control-tower")}
          disabled={!activeProject}
          className="flex-1 rounded-xl bg-white/[0.04] py-2 text-xs text-zinc-400 hover:bg-white/[0.06] disabled:opacity-40"
        >
          Tower
        </button>
        <button
          type="button"
          onClick={() => launch("god-bot")}
          disabled={!godBot}
          className="flex-1 rounded-xl bg-teal-500/15 py-2 text-xs text-teal-300 ring-1 ring-teal-500/20 disabled:opacity-40"
        >
          God Bot
        </button>
      </div>

      {godBot && activeProject && (
        <div className="mt-2">
          <CopyButton
            text={quickLaunchPrompt(activeProject, godBot, "god-bot")}
            label="Copy God Bot"
            compact
            className="w-full"
          />
        </div>
      )}

      <div className="mt-6">
        <TaskQueue limit={4} />
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-zinc-600">Recent</p>
        <ul className="space-y-1">
          {state.activity.slice(0, 4).map((a) => (
            <li key={a.id} className="text-xs text-zinc-600">
              <RelativeTime iso={a.createdAt} className="text-zinc-500" /> · {a.message}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href="/prompt-builder"
        className="mt-6 block rounded-xl bg-gradient-to-r from-teal-500/10 to-transparent py-3 text-center text-sm text-teal-300 ring-1 ring-teal-500/20"
      >
        Compose prompt →
      </Link>
    </aside>
  );
}
