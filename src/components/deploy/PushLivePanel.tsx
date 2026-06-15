"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import type { GitStatusSnapshot } from "@/lib/project-scan/git-status";
import {
  buildCursorPushLivePrompt,
  buildPushLiveShellCommand,
  resolvePushLiveTarget,
} from "@/lib/deploy/push-live";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn, copyToClipboard } from "@/lib/utils";
import { useIsLocalhost, useMounted } from "@/lib/hooks/use-mounted";

export function PushLivePanel({
  project,
  git,
  compact,
}: {
  project: Project | undefined;
  git?: GitStatusSnapshot | null;
  compact?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [gitLocal, setGitLocal] = useState<GitStatusSnapshot | null>(null);

  const gitResolved = git ?? gitLocal;

  useEffect(() => {
    if (git || !project?.path) return;
    void fetch("/api/projects/git-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    })
      .then((r) => r.json())
      .then((d: { git?: GitStatusSnapshot }) => {
        if (d.git) setGitLocal(d.git);
      })
      .catch(() => {});
  }, [project, git]);

  const target = useMemo(
    () => (project ? resolvePushLiveTarget(project, gitResolved) : null),
    [project, gitResolved],
  );
  const shellCmd = useMemo(
    () => (project ? buildPushLiveShellCommand(project) : null),
    [project],
  );
  const isLocalDev = useIsLocalhost();
  const mounted = useMounted();

  const sendToCursor = useCallback(async () => {
    if (!project) {
      setMsg("Pick a project first");
      return;
    }
    const text = buildCursorPushLivePrompt(project, gitResolved);
    if (!text) {
      setMsg("No folder path on this project — import from disk or set path");
      return;
    }
    setPrompt(text);
    const ok = await copyToClipboard(text);
    setMsg(
      ok
        ? "Copied — open Cursor on this folder → paste in agent chat → Enter"
        : "Prompt in box below — select all and copy",
    );
  }, [project, gitResolved]);

  const pushNow = useCallback(async () => {
    if (!project?.path) {
      setMsg("No project folder");
      return;
    }
    if (!isLocalDev) {
      setMsg("Push now only works on localhost (npm run dev). On lemon site use Copy → Cursor.");
      return;
    }
    setPushing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/deploy/push-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, message: `${project.name} live update` }),
      });
      const data = (await res.json()) as { ok: boolean; message: string; commit?: string };
      setMsg(data.commit ? `${data.message} · ${data.commit}` : data.message);
    } catch {
      setMsg("Push failed — use Copy → Cursor instead");
    } finally {
      setPushing(false);
    }
  }, [project, isLocalDev]);

  if (!project) {
    return (
      <p className="text-xs text-zinc-500">Pick a project in Builder Hub or Projects — push follows that folder.</p>
    );
  }

  if (!target) {
    return (
      <p className="text-xs text-amber-400/90">
        <strong className="text-amber-200">{project.name}</strong> has no disk path — Import from disk or set
        folder first.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2">
        <p className="text-[10px] uppercase text-zinc-600">Active project folder</p>
        <p className="mt-1 font-mono text-xs text-teal-200/90">{target.repoPath}</p>
        {target.githubUrl && (
          <p className="mt-1 truncate text-[10px] text-zinc-600">{target.githubUrl}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void sendToCursor()}
          className="rounded-full bg-teal-500 px-5 py-2.5 text-xs font-semibold text-black hover:bg-teal-400"
        >
          Copy → paste in Cursor
        </button>
        {isLocalDev && (
          <button
            type="button"
            onClick={() => void pushNow()}
            disabled={pushing}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {pushing ? "Pushing…" : "Push now (this folder)"}
          </button>
        )}
        {shellCmd && (
          <button
            type="button"
            onClick={() =>
              void copyToClipboard(shellCmd).then((ok) =>
                setMsg(ok ? "Copied PowerShell command" : "Copy failed"),
              )
            }
            className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Copy PowerShell
          </button>
        )}
      </div>

      {mounted && !isLocalDev && (
        <p className="text-[10px] text-zinc-600">
          On the public site: use <strong className="text-zinc-500">Copy → Cursor</strong> (browser cannot git push).
          Run Jeff OS locally for Push now.
        </p>
      )}

      {prompt && (
        <div className="space-y-2 rounded-xl border border-teal-500/25 bg-black/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-teal-300">Cursor prompt — paste in agent chat</p>
            <CopyButton text={prompt} label="Copy all" compact />
          </div>
          <textarea
            readOnly
            value={prompt}
            rows={compact ? 10 : 14}
            className="w-full cursor-text rounded-lg border border-white/10 bg-[#0a0b0e] px-2 py-2 font-mono text-[10px] leading-relaxed text-zinc-400"
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.currentTarget.select()}
          />
        </div>
      )}

      {shellCmd && !prompt && (
        <p className="font-mono text-[10px] text-zinc-700">{shellCmd}</p>
      )}

      {msg && <p className="text-xs text-teal-400">{msg}</p>}
    </div>
  );
}
