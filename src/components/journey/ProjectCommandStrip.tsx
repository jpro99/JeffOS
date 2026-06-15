"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import {
  getProjectQuickStatus,
  projectTabLabel,
  sortProjectsForCommandStrip,
} from "@/lib/mission/project-quick-status";
import { useIsLocalhost } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  rose: "bg-rose-500/20 text-rose-200 ring-rose-500/30",
  amber: "bg-amber-500/20 text-amber-100 ring-amber-500/30",
  teal: "bg-teal-500/20 text-teal-200 ring-teal-500/30",
  indigo: "bg-indigo-500/20 text-indigo-200 ring-indigo-500/30",
  emerald: "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30",
  zinc: "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20",
};

function parseProjectIdFromPath(pathname: string): string | null {
  const easy = pathname.match(/^\/easy\/projects\/([^/]+)/);
  if (easy) return decodeURIComponent(easy[1]);
  const classic = pathname.match(/^\/projects\/([^/]+)/);
  if (classic && classic[1] !== "new") return decodeURIComponent(classic[1]);
  return null;
}

function scrollToProjectWorkspace() {
  const el = document.getElementById("project-workspace");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function ProjectCommandStrip({ mode, compact }: { mode: "easy" | "classic"; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLocal = useIsLocalhost();
  const { state, switchProject, openWorkspace, togglePinProject, addActivity } = useMissionControl();

  const routeProjectId = parseProjectIdFromPath(pathname);
  const activeId = routeProjectId ?? state.workspace.activeProjectId ?? state.projects[0]?.id ?? null;

  const projects = useMemo(
    () => sortProjectsForCommandStrip(state.projects, state.workspace.pinnedProjectIds),
    [state.projects, state.workspace.pinnedProjectIds],
  );

  const activeProject = projects.find((p) => p.id === activeId) ?? null;
  const activeStatus = activeProject ? getProjectQuickStatus(activeProject) : null;
  const activeIndex = activeId ? projects.findIndex((p) => p.id === activeId) : -1;

  const projectHref = useCallback(
    (id: string) => (mode === "easy" ? `/easy/projects/${id}` : `/projects/${id}`),
    [mode],
  );

  const goTo = useCallback(
    (id: string, opts?: { replace?: boolean }) => {
      if (!state.projects.some((p) => p.id === id)) return;
      switchProject(id);
      openWorkspace(id);
      const href = projectHref(id);
      if (opts?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
      requestAnimationFrame(() => scrollToProjectWorkspace());
    },
    [router, switchProject, openWorkspace, projectHref, state.projects],
  );

  useEffect(() => {
    const id = parseProjectIdFromPath(pathname);
    if (!id || !state.projects.some((p) => p.id === id)) return;
    if (id !== state.workspace.activeProjectId) {
      switchProject(id);
      openWorkspace(id);
    }
  }, [pathname, state.projects, state.workspace.activeProjectId, switchProject, openWorkspace]);

  const goNext = useCallback(() => {
    if (projects.length === 0) return;
    const idx = activeIndex >= 0 ? activeIndex : 0;
    const next = projects[(idx + 1) % projects.length];
    goTo(next.id);
  }, [projects, activeIndex, goTo]);

  const goPrev = useCallback(() => {
    if (projects.length === 0) return;
    const idx = activeIndex >= 0 ? activeIndex : 0;
    const prev = projects[(idx - 1 + projects.length) % projects.length];
    goTo(prev.id);
  }, [projects, activeIndex, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-project-tab="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const pushActive = async () => {
    if (!activeProject?.path) return;
    if (!isLocal) {
      addActivity("Push: use localhost npm run dev", "routing", activeProject.id);
      return;
    }
    try {
      const res = await fetch("/api/deploy/push-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: activeProject, message: `${activeProject.name} live update` }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      addActivity(data.ok ? `Pushed ${activeProject.name}` : data.message, "routing", activeProject.id);
    } catch {
      addActivity(`Push failed: ${activeProject.name}`, "routing", activeProject.id);
    }
  };

  if (projects.length === 0) return null;

  return (
    <div className="border-b border-white/[0.06] bg-[#0c0d10]/95">
      <div className={cn("mx-auto px-4 py-2", mode === "easy" ? "max-w-3xl" : "max-w-[1600px]")}>
        <div className="flex flex-wrap items-center gap-2">
          {!compact && (
            <>
              <button
                type="button"
                onClick={goPrev}
                title="Previous project (Alt+←)"
                className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={goNext}
                title="Next project (Alt+→)"
                className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              >
                Next →
              </button>
            </>
          )}

          {!compact && activeProject && isLocal && activeProject.path && (
            <button
              type="button"
              onClick={() => void pushActive()}
              className="shrink-0 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30"
            >
              Push
            </button>
          )}

          {activeStatus && (
            <p className="hidden min-w-0 flex-1 truncate text-[11px] text-zinc-500 sm:block" title={activeStatus.nextTitle}>
              <span className={cn("mr-2 rounded-full px-2 py-0.5 ring-1", TONE_CLASS[activeStatus.tone])}>
                {activeStatus.summary}
              </span>
              {activeStatus.nextTitle}
            </p>
          )}
        </div>

        <div
          ref={scrollRef}
          className="mt-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
          role="tablist"
          aria-label="Projects"
        >
          {projects.map((p) => {
            const st = getProjectQuickStatus(p);
            const active = p.id === activeId;
            const pinned = state.workspace.pinnedProjectIds.includes(p.id);
            const href = projectHref(p.id);
            return (
              <Link
                key={p.id}
                href={href}
                role="tab"
                aria-selected={active}
                data-project-tab={p.id}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(p.id);
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  togglePinProject(p.id);
                }}
                title={`${p.name} — ${st.phaseLabel}${st.errorCount ? ` · ${st.errorCount} errors` : ""} · double-click pin`}
                className={cn(
                  "group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition",
                  active
                    ? "border-teal-500/40 bg-teal-500/15 text-teal-100"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:text-zinc-200",
                )}
              >
                {pinned && <span className="text-[9px] text-teal-600">●</span>}
                <span className="max-w-[100px] truncate text-xs font-medium">{projectTabLabel(p)}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium ring-1",
                    TONE_CLASS[st.tone],
                  )}
                >
                  {st.errorCount > 0 ? st.errorCount : st.phaseLabel.slice(0, 4)}
                </span>
              </Link>
            );
          })}
        </div>

        {!compact && (
          <p className="mt-1 text-[9px] text-zinc-700">
            Click tab = switch · Alt+←/→ = prev/next · double-click = pin
          </p>
        )}
      </div>
    </div>
  );
}
