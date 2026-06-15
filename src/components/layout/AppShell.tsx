"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMissionControl } from "@/lib/store/context";
import { CommandPalette, useCommandPalette } from "@/components/os/CommandPalette";
import { ProjectSwitcher } from "@/components/os/ProjectSwitcher";
import { ActiveContextRail } from "@/components/os/ActiveContextRail";
import { Dock } from "@/components/os/Dock";
import { RouteStrip } from "@/components/os/RouteStrip";
import { WorkspaceTabs } from "@/components/os/WorkspaceTabs";
import { ProjectCommandStrip } from "@/components/journey/ProjectCommandStrip";
import { ProjectCostBadge } from "@/components/workspace/ProjectCostBadge";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useVoice } from "@/components/voice/VoiceProvider";

import { navForExperience } from "@/lib/ui/experience";

const navHints: Record<string, string> = {
  "/": "Dashboard + next action",
  "/projects": "Pick what to work on",
  "/bots": "AI roles",
  "/tasks": "Work queue",
  "/prompt-builder": "Custom prompts",
  "/routing": "Model + bot routing",
  "/settings": "Defaults",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useMissionControl();
  const { open, setOpen } = useCommandPalette();
  const { openPanel: openVoicePanel } = useVoice();
  const compact = state.settings.compactMode;
  const mobile = state.settings.mobileMode;
  const sidebarCompact = compact || mobile;
  const nav = navForExperience(state.settings.experienceLevel);

  return (
    <>
      <CommandPalette open={open} onClose={() => setOpen(false)} />

      <div className="flex min-h-screen bg-[#0b0c0f] text-zinc-100">
        {/* Sidebar — dock on desktop */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-white/[0.05] bg-[#0c0d11]/95 backdrop-blur-2xl md:flex",
            sidebarCompact ? "w-[68px]" : "w-56",
          )}
        >
          <div className={cn("p-4", sidebarCompact && "px-2")}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-sm text-teal-400 ring-1 ring-teal-500/20">
                ◆
              </div>
              {!sidebarCompact && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">Jeff OS</p>
                  <p className="text-sm font-medium text-zinc-300">v1</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-2">
            <Link
              href="/easy"
              title="Easy Mode — guided missions"
              className={cn(
                "mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                pathname.startsWith("/easy")
                  ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25"
                  : "text-teal-600 hover:bg-teal-500/10 hover:text-teal-300",
                sidebarCompact && "justify-center px-2",
              )}
            >
              <span className="text-base">✦</span>
              {!sidebarCompact && "Easy Mode"}
            </Link>
            {nav.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={navHints[item.href] ?? item.label}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                    active
                      ? "bg-white/[0.06] text-zinc-100"
                      : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300",
                    sidebarCompact && "justify-center px-2",
                  )}
                >
                  <span className={cn("text-base", active && "text-teal-400")}>{item.icon}</span>
                  {!sidebarCompact && item.label}
                </Link>
              );
            })}
          </nav>

          {!sidebarCompact && (
            <div className="border-t border-white/[0.05] p-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-left text-xs text-zinc-500 hover:bg-white/[0.05]"
              >
                <span>⌘</span>
                <span>Command</span>
                <kbd className="ml-auto rounded bg-black/30 px-1.5 text-[10px]">K</kbd>
              </button>
            </div>
          )}
        </aside>

        {/* Main column */}
        <div
          className={cn(
            "flex min-h-screen flex-1 flex-col",
            sidebarCompact ? "md:pl-[68px]" : "md:pl-56",
            mobile && "pb-20",
          )}
        >
          {/* Top bar — workspace + route */}
          <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#0b0c0f]/90 backdrop-blur-2xl">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
              <ProjectSwitcher compact={mobile} />

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="hidden flex-1 items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-2 text-sm text-zinc-600 transition hover:bg-white/[0.05] md:flex md:max-w-xs lg:max-w-sm"
              >
                <span>⌘</span>
                <span>Search…</span>
              </button>

              <div className="ml-auto hidden lg:block">
                <RouteStrip compact />
              </div>

              <VoiceMicButton compact />
              <ProjectCostBadge compact />
              <button
                type="button"
                onClick={openVoicePanel}
                className="hidden text-xs text-zinc-600 hover:text-zinc-400 sm:inline"
              >
                Voice
              </button>

              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                <Link
                  href="/easy"
                  className="rounded-full bg-teal-500/10 px-2 py-0.5 text-teal-600 hover:text-teal-400"
                >
                  Easy
                </Link>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    state.settings.autoRoute ? "bg-teal-500/10 text-teal-600" : "bg-white/5",
                  )}
                >
                  {state.settings.autoRoute ? "Auto" : "Manual"}
                </span>
                {state.settings.cavemanDefault && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5">Caveman</span>
                )}
              </div>
            </div>
          </header>

          <ProjectCommandStrip mode="classic" />

          <WorkspaceTabs />

          <div className="flex flex-1">
            <main id="project-workspace" className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
            <ActiveContextRail />
          </div>
        </div>
      </div>

      <Dock onCommand={() => setOpen(true)} />
    </>
  );
}
