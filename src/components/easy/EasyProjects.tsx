"use client";

import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { EasyImportHub } from "@/components/easy/EasyImportHub";
import { getProjectQuickStatus } from "@/lib/mission/project-quick-status";
import { priorityColors, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export function EasyProjects() {
  const { state, switchProject, openWorkspace } = useMissionControl();
  const projects = [...state.projects].sort((a, b) => {
    const po = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return po[a.priority] - po[b.priority];
  });

  const openProject = (id: string) => {
    switchProject(id);
    openWorkspace(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Your projects</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tap a project below, or use the tabs at the top to switch anytime.
        </p>
      </div>

      <Link
        href="/easy/new"
        className="block rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 text-center transition hover:border-teal-500/50 hover:bg-teal-500/15"
      >
        <p className="text-lg font-semibold text-teal-100">+ New project</p>
        <p className="mt-1 text-sm text-teal-700/80">What do you want to create → folder → build</p>
      </Link>

      <EasyImportHub compact />

      <ul className="space-y-2">
        {projects.map((p) => {
          const st = getProjectQuickStatus(p);
          return (
            <li key={p.id}>
              <Link
                href={`/easy/projects/${p.id}`}
                onClick={() => openProject(p.id)}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition hover:border-teal-500/25 hover:bg-teal-500/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-100">{p.name}</p>
                  <p className="truncate text-[11px] text-zinc-600">{st.nextTitle}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] ring-1",
                    st.tone === "rose" && "bg-rose-500/15 text-rose-200 ring-rose-500/25",
                    st.tone === "amber" && "bg-amber-500/15 text-amber-100 ring-amber-500/25",
                    st.tone === "teal" && "bg-teal-500/15 text-teal-200 ring-teal-500/25",
                    st.tone === "indigo" && "bg-indigo-500/15 text-indigo-200 ring-indigo-500/25",
                    st.tone === "emerald" && "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
                    st.tone === "zinc" && "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20",
                  )}
                >
                  {st.summary}
                </span>
                <Badge className={priorityColors[p.priority]}>{p.priority}</Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
