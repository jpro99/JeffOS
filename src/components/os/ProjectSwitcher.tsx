"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useMissionControl, useWorkspace } from "@/lib/store/context";
import { cn } from "@/lib/utils";

export function ProjectSwitcher({ compact }: { compact?: boolean }) {
  const { state } = useMissionControl();
  const { activeProject, workspace, switchProject } = useWorkspace();
  const projects = state.projects;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const recent = workspace.recentProjectIds
    .map((id) => projects.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-xl transition",
          compact
            ? "px-2 py-1.5 text-sm"
            : "border border-white/[0.06] bg-white/[0.03] px-3 py-2 hover:bg-white/[0.05]",
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-xs text-teal-300">
          {(activeProject?.name ?? "?").charAt(0)}
        </span>
        {!compact && (
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-zinc-600">Workspace</p>
            <p className="max-w-[140px] truncate text-sm font-medium text-zinc-200">
              {activeProject?.name ?? "Pick project"}
            </p>
          </div>
        )}
        <span className="text-zinc-600">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14161c] shadow-xl">
          <div className="border-b border-white/[0.06] px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-600">
            Recent
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {recent.map((p) =>
              p ? (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      switchProject(p.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-white/[0.04]",
                      p.id === activeProject?.id && "bg-teal-500/10 text-teal-200",
                    )}
                  >
                    <span className="text-zinc-500">{p.priority}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                </li>
              ) : null,
            )}
          </ul>
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="block border-t border-white/[0.06] px-3 py-2.5 text-center text-xs text-teal-500 hover:bg-white/[0.02]"
          >
            All projects →
          </Link>
        </div>
      )}
    </div>
  );
}
