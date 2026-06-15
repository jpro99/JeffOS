"use client";

import type { Project } from "@/lib/types";
import { getBuildPrerequisites } from "@/lib/mission/build-prerequisites";
import { createProjectFolderOnDisk } from "@/components/shared/ProjectLocationPicker";
import { cn, copyToClipboard } from "@/lib/utils";
import { useState } from "react";

export function CursorBuildPrerequisites({ project }: { project: Project }) {
  const pre = getBuildPrerequisites(project);
  const isReady = pre.kind === "ready";
  const [folderMsg, setFolderMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const createFolder = async () => {
    const path = pre.suggestedPath ?? project.path;
    if (!path) return;
    setCreating(true);
    setFolderMsg(null);
    const result = await createProjectFolderOnDisk(path);
    setFolderMsg(result.message);
    setCreating(false);
  };

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isReady
          ? "border-emerald-500/25 bg-emerald-500/[0.06]"
          : "border-amber-500/30 bg-amber-500/[0.08]",
      )}
    >
      <p
        className={cn(
          "text-sm font-semibold",
          isReady ? "text-emerald-200" : "text-amber-100",
        )}
      >
        Before you paste — {pre.title}
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-400">
        {pre.steps.map((step) => (
          <li key={step.slice(0, 40)}>{step}</li>
        ))}
      </ol>
      {pre.shellCommand && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] uppercase text-zinc-600">Run once in PowerShell</p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-[10px] text-zinc-400">
            {pre.shellCommand}
          </pre>
          <button
            type="button"
            onClick={() => void copyToClipboard(pre.shellCommand!)}
            className="text-[10px] text-teal-500 hover:underline"
          >
            Copy command
          </button>
          <button
            type="button"
            onClick={() => void createFolder()}
            disabled={creating}
            className="ml-3 text-[10px] text-emerald-500 hover:underline disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create folder now (localhost)"}
          </button>
          {folderMsg && <p className="mt-1 text-[10px] text-teal-500">{folderMsg}</p>}
        </div>
      )}
      <p className="mt-3 text-[10px] text-zinc-600">
        Jeff OS does not compile or create files in the browser.{" "}
        <strong className="text-zinc-500">Cursor builds for you</strong> when you paste the box below.
      </p>
    </div>
  );
}
