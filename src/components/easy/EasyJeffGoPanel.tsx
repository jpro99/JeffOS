"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { useIsLocalhost, useMounted } from "@/lib/hooks/use-mounted";
import { PushLivePanel } from "@/components/deploy/PushLivePanel";
import { cn, copyToClipboard } from "@/lib/utils";

const STEPS = [
  {
    n: 1,
    title: "Start Jeff OS (once per session)",
    body: "Double-click shortcut or run npm run go — opens browser + Cursor.",
    cmd: "npm run go",
  },
  {
    n: 2,
    title: "Build or fix in Jeff OS → paste in Cursor",
    body: "Builder Hub: type need → Build it. Or Paste & fix on any project. Copy prompt → Cursor chat → Enter.",
    cmd: null,
  },
  {
    n: 3,
    title: "Push live",
    body: "One command after Cursor finishes. Vercel auto-updates in ~2 min.",
    cmd: "npm run push-live",
  },
] as const;

export function EasyJeffGoPanel() {
  const { state } = useMissionControl();
  const [msg, setMsg] = useState<string | null>(null);
  const [showPush, setShowPush] = useState(false);

  const activeProject = useMemo(
    () =>
      state.projects.find((p) => p.id === state.workspace.activeProjectId) ??
      state.projects.find((p) => p.id === "proj-jeff-os") ??
      state.projects[0],
    [state.projects, state.workspace.activeProjectId],
  );

  const isLocal = useIsLocalhost();
  const mounted = useMounted();

  return (
    <section className="rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-500/[0.08] to-black/20 p-6 shadow-lg shadow-teal-500/5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">
        Easiest way — 3 steps
      </p>
      <h2 className="mt-1 text-xl font-semibold text-zinc-50">Jeff Go workflow</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Work on <strong className="text-zinc-400">localhost</strong> (full power). Lemon site is for phone/view only.
        Jeff OS plans — Cursor builds — one command ships.
      </p>

      <ol className="mt-5 space-y-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-200 ring-1 ring-teal-500/30">
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-200">{s.title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{s.body}</p>
              {s.cmd && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-black/40 px-2 py-1 font-mono text-[11px] text-teal-300">
                    {s.cmd}
                  </code>
                  <button
                    type="button"
                    onClick={() =>
                      void copyToClipboard(s.cmd!).then((ok) =>
                        setMsg(ok ? `Copied: ${s.cmd}` : "Copy failed"),
                      )
                    }
                    className="text-[10px] text-teal-500 hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            void copyToClipboard("npm run go").then((ok) =>
              setMsg(ok ? "Copied npm run go — paste in PowerShell at jeff-mission-control" : "Copy failed"),
            )
          }
          className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
        >
          Copy npm run go
        </button>
        <button
          type="button"
          onClick={() => setShowPush((v) => !v)}
          className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.05]"
        >
          {showPush ? "Hide push" : "Push live"}
        </button>
        <Link
          href="/easy/new"
          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-sm text-violet-200"
        >
          New app
        </Link>
      </div>

      {mounted && !isLocal && (
        <p className={cn("mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100")}>
          You are on the public site — push and create-folder need{" "}
          <strong>npm run go</strong> on your PC.
        </p>
      )}

      {showPush && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <PushLivePanel project={activeProject} compact />
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-teal-400">{msg}</p>}
    </section>
  );
}
