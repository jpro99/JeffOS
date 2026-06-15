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
import { cn, copyToClipboard } from "@/lib/utils";

export function ProjectFolderBanner({ project }: { project: Project }) {
  const { state, updateProject } = useMissionControl();
  const pre = getBuildPrerequisites(project);
  const suggested = suggestProjectFolder(project);
  const displayPath = project.path?.trim() || suggested;

  const [editing, setEditing] = useState(false);
  const [location, setLocation] = useState<ProjectLocationValue>(() => ({
    parentFolder: DEFAULT_PROJECTS_ROOT,
    targetPath: displayPath,
  }));
  const [msg, setMsg] = useState<string | null>(null);

  const status = useMemo(() => {
    if (project.path?.trim() && project.pathExists !== false) {
      return {
        label: "Folder on your PC — Cursor builds files here",
        tone: "ready" as const,
        who: "Cursor creates code inside this folder when you paste the prompt.",
      };
    }
    if (project.path?.trim()) {
      return {
        label: "Path set — folder not created yet",
        tone: "warn" as const,
        who: "Jeff OS or you create the empty folder; Cursor fills it when you paste.",
      };
    }
    return {
      label: "No folder linked — path auto-suggested from project name",
      tone: "warn" as const,
      who: "Set path below, or Create folder now (localhost). Cursor scaffolds if you paste without a folder.",
    };
  }, [project.path, project.pathExists]);

  const savePath = () => {
    const path = resolveProjectPath(
      location.parentFolder,
      project.name,
      location.targetPath || undefined,
    );
    updateProject({ ...project, path, pathExists: false });
    setEditing(false);
    setMsg(`Saved folder path: ${path}`);
  };

  const createFolder = async () => {
    const path = project.path?.trim() || resolveProjectPath(location.parentFolder, project.name, location.targetPath || undefined);
    const result = await createProjectFolderOnDisk(path);
    if (result.ok) {
      updateProject({ ...project, path, pathExists: true });
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
          <button
            type="button"
            onClick={() => void createFolder()}
            className="rounded-full bg-teal-500/90 px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-teal-400"
          >
            Create folder now
          </button>
        </div>
      </div>

      <p className="mt-2 font-mono text-sm text-teal-200/95 break-all">{displayPath}</p>
      <p className="mt-2 text-xs text-zinc-500">{status.who}</p>

      <ul className="mt-3 space-y-1 text-[11px] text-zinc-600">
        <li>
          <strong className="text-zinc-500">Jeff OS</strong> — plans only (browser). Does not write code files.
        </li>
        <li>
          <strong className="text-zinc-500">You / Jeff OS localhost</strong> — can create the empty folder (
          button above).
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
