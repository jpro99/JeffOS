"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import type { GitStatusSnapshot } from "@/lib/project-scan/git-status";
import { buildShipPrompt, shipReadinessLabel, type ShipAction } from "@/lib/mission/deploy";
import { useMissionControl } from "@/lib/store/context";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn, copyToClipboard } from "@/lib/utils";

export function EasyShipPanel({ project }: { project: Project }) {
  const { state, addActivity } = useMissionControl();
  const [git, setGit] = useState<GitStatusSnapshot | null>(null);
  const [vercelLinked, setVercelLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promptText, setPromptText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const buildVerified =
    project.ops.liveVerify?.canAdvance === true ||
    project.ops.errorFixMission?.lastVerifyPassed === true ||
    project.ops.errorFixMission?.status === "complete";

  const loadGit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/git-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        git?: GitStatusSnapshot;
        vercelLinked?: boolean;
        error?: string;
      };
      if (data.git) setGit(data.git);
      if (data.vercelLinked !== undefined) setVercelLinked(data.vercelLinked);
      if (!data.ok && data.error) setMsg(data.error);
    } catch {
      setMsg("Run npm run dev locally to read git status");
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    void loadGit();
  }, [loadGit]);

  const copyShipPrompt = async (action: ShipAction) => {
    if (!git) {
      setMsg("Git status not loaded yet");
      return;
    }
    const bundle = buildShipPrompt(action, project, state, git, {
      vercelLinked,
      buildVerified,
    });
    setPromptText(bundle);
    const ok = await copyToClipboard(bundle);
    setMsg(ok ? "Copied ship prompt — paste in Cursor" : "Prompt shown below — copy manually");
    if (ok) addActivity(`Ship prompt (${action}): ${project.name}`, "routing", project.id);
  };

  const readiness = git
    ? shipReadinessLabel(git, buildVerified)
    : { label: "Loading…", tone: "wait" as const, hint: "" };

  const ghUrl = project.connections?.find((c) => c.kind === "github")?.url;
  const vercelUrl =
    project.connections?.find((c) => c.kind === "vercel")?.dashboardUrl ??
    project.connections?.find((c) => c.kind === "vercel")?.url;

  return (
    <section
      id="ship-panel"
      className="space-y-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.04] p-5"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
          Ship to GitHub + Vercel
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Jeff OS never auto-pushes. Verify build → copy prompt → Cursor pushes Git → Vercel builds
          from GitHub.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 text-sm">
        {loading ? (
          <p className="text-zinc-500">Reading git status…</p>
        ) : (
          <>
            <p
              className={cn(
                "font-medium",
                readiness.tone === "ready" && "text-emerald-300",
                readiness.tone === "wait" && "text-amber-200",
                readiness.tone === "blocked" && "text-rose-300",
              )}
            >
              {readiness.label}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{readiness.hint}</p>
            {git && (
              <p className="mt-2 font-mono text-[10px] text-zinc-600">
                {git.branch && `branch ${git.branch}`}
                {git.changedFiles > 0 && ` · ${git.changedFiles} changed`}
                {git.ahead > 0 && ` · ${git.ahead} ahead`}
                {vercelLinked && " · Vercel linked"}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void copyShipPrompt("github-push")}
          disabled={loading || !git?.isRepo}
          className="rounded-full border border-white/10 bg-white/[0.05] py-2.5 text-xs font-medium text-zinc-200 hover:border-indigo-500/30 disabled:opacity-40"
        >
          Copy Git push prompt
        </button>
        <button
          type="button"
          onClick={() => void copyShipPrompt("vercel-ship")}
          disabled={loading}
          className="rounded-full border border-white/10 bg-white/[0.05] py-2.5 text-xs font-medium text-zinc-200 hover:border-indigo-500/30 disabled:opacity-40"
        >
          Copy Vercel check prompt
        </button>
        <button
          type="button"
          onClick={() => void copyShipPrompt("full-ship")}
          disabled={loading || !git?.isRepo}
          className="rounded-full bg-indigo-500 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-40"
        >
          Copy full ship prompt
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {ghUrl && (
          <a href={ghUrl} target="_blank" rel="noreferrer" className="text-teal-500 hover:underline">
            Open GitHub repo ↗
          </a>
        )}
        {vercelUrl && (
          <a href={vercelUrl} target="_blank" rel="noreferrer" className="text-teal-500 hover:underline">
            Open Vercel dashboard ↗
          </a>
        )}
        <button type="button" onClick={() => void loadGit()} className="text-zinc-500 hover:text-zinc-300">
          Refresh git status
        </button>
      </div>

      {promptText && (
        <div className="space-y-2 rounded-xl border border-indigo-500/20 bg-black/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-indigo-300">Ship command — paste in Cursor</p>
            <CopyButton text={promptText} label="Copy" compact />
          </div>
          <textarea
            readOnly
            value={promptText}
            rows={10}
            className="w-full resize-y rounded-lg border border-white/10 bg-[#0a0b0e] px-2 py-2 font-mono text-[10px] text-zinc-400"
          />
        </div>
      )}

      <details className="text-xs text-zinc-600">
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400">
          What happens automatically?
        </summary>
        <ul className="mt-2 space-y-1 pl-4">
          <li>· Recheck project = local npm build only (free, no deploy)</li>
          <li>· Git push = you or Cursor agent (not Jeff OS alone)</li>
          <li>· Vercel = auto-builds when GitHub gets a push (if repo connected)</li>
          <li>· Failed Vercel build costs credits — verify locally first</li>
        </ul>
      </details>

      {msg && <p className="text-center text-xs text-teal-500">{msg}</p>}
    </section>
  );
}
