"use client";

import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { EasyImportHub } from "@/components/easy/EasyImportHub";
import { gapSignalCount } from "@/lib/mission/portfolio-pulse";
import { priorityColors } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
export function EasyProjects() {
  const { state } = useMissionControl();
  const projects = [...state.projects].sort((a, b) => {
    const po = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return po[a.priority] - po[b.priority];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Pick a project</h1>
        <p className="mt-1 text-sm text-zinc-500">Tap one — or start a new app with the step wizard.</p>
      </div>

      <Link
        href="/easy/new"
        className="block rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 text-center transition hover:border-teal-500/50 hover:bg-teal-500/15"
      >
        <p className="text-lg font-semibold text-teal-100">+ New application</p>
        <p className="mt-1 text-sm text-teal-700/80">Idea → suggestion → God Mode → Build it</p>
      </Link>

      <EasyImportHub compact />

      <ul className="space-y-3">
        {projects.map((p) => {
          const verified = p.ops.liveVerify?.canAdvance === true;
          const gaps = gapSignalCount(p);
          return (
          <li key={p.id}>
            <Link
              href={`/easy/projects/${p.id}`}
              className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-teal-500/25 hover:bg-teal-500/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-zinc-100">{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{p.ops.plainSummary}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge className={priorityColors[p.priority]}>{p.priority}</Badge>
                  {verified && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 ring-1 ring-emerald-500/25">
                      Ship ready
                    </span>
                  )}
                  {gaps > 0 && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200 ring-1 ring-amber-500/20">
                      ~{gaps} backlog
                    </span>
                  )}
                </div>
              </div>
              {p.path && (
                <p className="mt-3 truncate font-mono text-[10px] text-zinc-600">{p.path}</p>
              )}
            </Link>
          </li>
        );})}      </ul>

      <Link href="/easy/new" className="text-sm text-teal-500 hover:underline">
        + New application (step wizard)
      </Link>
    </div>
  );
}
