"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";

export function WorkspaceTabs() {
  const router = useRouter();
  const { state, switchProject, closeWorkspace, minimizeWorkspace, togglePinProject } = useMissionControl();
  const { openWorkspaceIds, activeProjectId, pinnedProjectIds, minimizedProjectIds } = state.workspace;

  if (openWorkspaceIds.length === 0) return null;

  const go = (id: string) => {
    switchProject(id);
    router.push(`/projects/${id}`);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.05] px-2 py-1 scrollbar-none">
      {openWorkspaceIds.map((id) => {
        const p = state.projects.find((x) => x.id === id);
        if (!p) return null;
        const active = id === activeProjectId;
        const minimized = minimizedProjectIds.includes(id);
        const pinned = pinnedProjectIds.includes(id);

        return (
          <div
            key={id}
            className={cn(
              "group flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs transition",
              active ? "bg-white/[0.08] text-zinc-100" : "text-zinc-500 hover:bg-white/[0.04]",
              minimized && "opacity-50",
            )}
          >
            <button type="button" onClick={() => go(id)} className="max-w-[120px] truncate">
              {pinned && <span className="mr-1 text-teal-600">•</span>}
              {p.name.split(" ")[0]}
            </button>
            <button
              type="button"
              title="Pin"
              onClick={() => togglePinProject(id)}
              className="hidden text-zinc-600 hover:text-teal-500 group-hover:inline"
            >
              📌
            </button>
            <button
              type="button"
              title="Minimize"
              onClick={() => minimizeWorkspace(id)}
              className="text-zinc-600 hover:text-zinc-400"
            >
              −
            </button>
            <button
              type="button"
              title="Close"
              onClick={() => closeWorkspace(id)}
              className="text-zinc-600 hover:text-rose-400"
            >
              ×
            </button>
          </div>
        );
      })}
      <Link href="/projects" className="shrink-0 px-2 py-1 text-xs text-zinc-600 hover:text-zinc-400">
        + All
      </Link>
    </div>
  );
}
