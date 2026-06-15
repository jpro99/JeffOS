"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";

function parseProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  if (match && match[1] !== "new") return decodeURIComponent(match[1]);
  return null;
}

export function WorkspaceTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, switchProject, closeWorkspace, minimizeWorkspace, togglePinProject, openWorkspace } =
    useMissionControl();
  const { openWorkspaceIds, activeProjectId, pinnedProjectIds, minimizedProjectIds } = state.workspace;

  useEffect(() => {
    const id = parseProjectIdFromPath(pathname);
    if (!id || !state.projects.some((p) => p.id === id)) return;
    if (id !== activeProjectId) {
      switchProject(id);
      openWorkspace(id);
    }
  }, [pathname, activeProjectId, state.projects, switchProject, openWorkspace]);

  if (openWorkspaceIds.length === 0) return null;

  const go = (id: string) => {
    switchProject(id);
    openWorkspace(id);
    router.push(`/projects/${id}`);
    requestAnimationFrame(() => {
      document.getElementById("project-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="relative z-30 flex items-center gap-1 overflow-x-auto border-b border-white/[0.05] bg-[#0b0c0f]/90 px-2 py-1 scrollbar-none">
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
            <Link
              href={`/projects/${id}`}
              onClick={(e) => {
                e.preventDefault();
                go(id);
              }}
              className="max-w-[120px] truncate"
            >
              {pinned && <span className="mr-1 text-teal-600">•</span>}
              {p.name.split(" ")[0]}
            </Link>
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
