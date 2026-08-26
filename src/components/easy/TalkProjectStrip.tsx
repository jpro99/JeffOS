"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/lib/types";
import {
  getProjectQuickStatus,
  projectTabLabel,
  sortProjectsForCommandStrip,
} from "@/lib/mission/project-quick-status";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  rose: "bg-rose-500/20 text-rose-200 ring-rose-500/30",
  amber: "bg-amber-500/20 text-amber-100 ring-amber-500/30",
  teal: "bg-teal-500/20 text-teal-200 ring-teal-500/30",
  indigo: "bg-indigo-500/20 text-indigo-200 ring-indigo-500/30",
  emerald: "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30",
  zinc: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20",
};

type TalkProjectStripProps = {
  projects: Project[];
  pinnedIds: string[];
  activeId: string | null;
  onSelect: (projectId: string | null) => void;
};

export function TalkProjectStrip({
  projects,
  pinnedIds,
  activeId,
  onSelect,
}: TalkProjectStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sorted = sortProjectsForCommandStrip(projects, pinnedIds);

  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    scrollRef.current
      .querySelector(`[data-talk-tab="${activeId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  if (sorted.length === 0) return null;

  return (
    <div className="talk-project-strip border-b border-[#2a3c5a]/80 bg-[#0c1424]/95">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none"
        role="tablist"
        aria-label="Projects"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!activeId}
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
            !activeId
              ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
              : "border-[#2a3c5a] bg-[#16233a]/60 text-slate-400 hover:text-slate-200",
          )}
        >
          All
        </button>
        {sorted.map((p) => {
          const st = getProjectQuickStatus(p);
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-talk-tab={p.id}
              onClick={() => onSelect(p.id)}
              title={p.name}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition",
                active
                  ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                  : "border-[#2a3c5a] bg-[#16233a]/60 text-slate-400 hover:border-sky-500/30 hover:text-slate-200",
              )}
            >
              <span className="max-w-[120px] truncate text-xs font-semibold">
                {projectTabLabel(p)}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-medium ring-1",
                  TONE_CLASS[st.tone],
                )}
              >
                {st.errorCount > 0 ? st.errorCount : st.phaseLabel.slice(0, 4)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
