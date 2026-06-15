"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { getBuildPrerequisites, suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import {
  ProjectLocationPicker,
  createProjectFolderOnDisk,
  type ProjectLocationValue,
} from "@/components/shared/ProjectLocationPicker";
import { DEFAULT_PROJECTS_ROOT } from "@/lib/discovery/catalog";
import { resolveProjectPath } from "@/lib/mission/project-location";
import { useMissionControl } from "@/lib/store/context";
import { useFolderSync } from "@/lib/hooks/use-folder-sync";
import { cn, copyToClipboard } from "@/lib/utils";

export function ProjectFolderBanner({ project }: { project: Project }) {
  const { state, updateProject } = useMissionControl();
  const { status: diskStatus, checking, recheck } = useFolderSync(project);
  const pre = getBuildPrerequisites(project);
  const suggested = suggestProjectFolder(project);
  const displayPath = project.path?.trim() || diskStatus?.path || suggested;

  const [editing, setEditing] = useState(false);
  const [location, setLocation] = useState<ProjectLocationValue>(() => ({
    parentFolder: DEFAULT_PROJECTS_ROOT,
    targetPath: displayPath,
  }));
  const [msg, setMsg] = useState<string | null>(null);

  const onDisk = Boolean(diskStatus?.exists || project.pathExists === true);

  const status = useMemo(() => {
    if (checking && !diskStatus) {
      return {
        label: "Checking folder on disk…",
        tone: "warn" as const,
        who: "Jeff OS looks at your PC so it knows if Cursor already created files here.",
      };
    }
    if (onDisk) {
      const bits: string[] = [];
      if (diskStatus?.topLevelCount) {
        bits.push(`${diskStatus.topLevelCount} item${diskStatus.topLevelCount === 1 ? "" : "s"}`);
      }
      if (diskStatus?.isGitRepo) bits.push("git repo");
      if (diskStatus?.hasPackageJson) bits.push("package.json");
      const detail = bits.length ? ` (${bits.join(", ")})` : "";
      return {
        label: `Folder on your PC${detail} — Cursor builds files here`,
        tone: "ready" as const,
        who: diskStatus?.message ?? "Path matches a real folder. Paste prompts in Cursor on this path.",
      };
    }
    if (project.path?.trim()) {
      return {
        label: "Path set — folder not found on disk yet",
        tone: "warn" as const,
        who: "Create the folder below, or paste in Cursor — it may scaffold for you. Click Re-check after Cursor writes files.",
      };
    }
    return {
      label: "No folder linked — path auto-suggested from project name",
      tone: "warn" as const,
      who: "Set path below, or Create folder now (localhost). Cursor scaffolds if you paste without a folder.",
    };
  }, [checking, diskStatus, onDisk, project.path]);

  const savePath = () => {
    const path = resolveProjectPath(
      location.parentFolder,
      project.name,
      location.targetPath || undefined,
    );
    updateProject({ ...project, path });
    setEditing(false);
    setMsg(`Saved folder path: ${path} — checking disk…`);
    void recheck().then((data) => {
      if (data?.exists) setMsg(`Folder found on disk: ${path}`);
    });
  };

  const createFolder = async () => {
    const path =
      project.path?.trim() ||
      resolveProjectPath(location.parentFolder, project.name, location.targetPath || undefined);
    const result = await createProjectFolderOnDisk(path);
    if (result.ok) {
      updateProject({ ...project, path, pathExists: true });
      await recheck();
    }
    setMsg(result.message);
  };

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4",
        status.tone === "ready"
          ? "border-emerald-500/30 bg-emerald-500/[0.07]"
          : "border-amber-500/35 bg-amber-500/[0.08]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Project folder on disk
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              status.tone === "ready" ? "text-emerald-200" : "text-amber-100",
            )}
          >
            {status.label}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void recheck()}
            disabled={checking}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
          >
            {checking ? "Checking…" : "Re-check disk"}
          </button>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
          >
            {editing ? "Cancel" : "Change folder"}
          </button>
          {pre.shellCommand && (
            <button
              type="button"
              onClick={() => void copyToClipboard(pre.shellCommand!)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Copy PowerShell
            </button>
          )}
          {!onDisk && (
            <button
              type="button"
              onClick={() => void createFolder()}
              className="rounded-full bg-teal-500/90 px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-teal-400"
            >
              Create folder now
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 font-mono text-sm text-teal-200/95 break-all">{displayPath}</p>
      <p className="mt-2 text-xs text-zinc-500">{status.who}</p>

      <ul className="mt-3 space-y-1 text-[11px] text-zinc-600">
        <li>
          <strong className="text-zinc-500">Jeff OS</strong> — plans only (browser). Re-checks disk on load.
        </li>
        <li>
          <strong className="text-zinc-500">Cursor</strong> — builds all code when you paste the prompt below.
        </li>
      </ul>

      {editing && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <ProjectLocationPicker
            projectName={project.name}
            parentOptions={state.settings.projectsRoots}
            value={location}
            onChange={setLocation}
            compact
          />
          <button
            type="button"
            onClick={savePath}
            className="mt-3 rounded-full bg-teal-500 px-5 py-2 text-xs font-semibold text-black"
          >
            Save folder path
          </button>
        </div>
      )}

      {msg && <p className="mt-2 text-xs text-teal-400">{msg}</p>}
    </div>
  );
}
