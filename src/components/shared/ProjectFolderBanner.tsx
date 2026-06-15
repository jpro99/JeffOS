"use client";

import { useEffect, useMemo, useState } from "react";
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

function parentFromPath(fullPath: string): string {
  const trimmed = fullPath.trim();
  const idx = trimmed.lastIndexOf("\\");
  if (idx <= 0) return DEFAULT_PROJECTS_ROOT;
  return trimmed.slice(0, idx);
}

export function ProjectFolderBanner({
  project,
  collapseWhenLinked,
}: {
  project: Project;
  /** Collapse to one line when folder is found — expand with Change folder */
  collapseWhenLinked?: boolean;
}) {
  const { state, updateProject } = useMissionControl();
  const { status: diskStatus, checking, recheck } = useFolderSync(project);
  const pre = getBuildPrerequisites(project);
  const suggested = suggestProjectFolder(project);
  const displayPath = project.path?.trim() || diskStatus?.path || suggested;

  const onDisk = Boolean(diskStatus?.exists === true || project.pathExists === true);
  const stillChecking = checking && !diskStatus;

  const [editing, setEditing] = useState(() => !onDisk);
  const [location, setLocation] = useState<ProjectLocationValue>(() => ({
    parentFolder: project.path ? parentFromPath(project.path) : DEFAULT_PROJECTS_ROOT,
    targetPath: displayPath,
  }));
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (onDisk) {
      setMsg(null);
      if (collapseWhenLinked) setEditing(false);
      return;
    }
    if (stillChecking) return;
    setEditing(true);
    if (project.path?.trim()) {
      setMsg("Folder not found at saved path — browse to the new location and Apply folder.");
    }
  }, [onDisk, stillChecking, project.path, collapseWhenLinked]);

  useEffect(() => {
    setLocation({
      parentFolder: project.path ? parentFromPath(project.path) : DEFAULT_PROJECTS_ROOT,
      targetPath: project.path?.trim() || suggested,
    });
  }, [project.id, project.path, suggested]);

  const status = useMemo(() => {
    if (stillChecking) {
      return {
        label: "Checking folder…",
        tone: "warn" as const,
        who: "Looking on your PC…",
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
        label: `Folder linked${detail}`,
        tone: "ready" as const,
        who: diskStatus?.message ?? "Path matches a real folder on your PC.",
      };
    }
    if (project.path?.trim()) {
      return {
        label: "Saved path not found",
        tone: "warn" as const,
        who: "Browse on my PC → pick folder → Apply folder.",
      };
    }
    return {
      label: "No folder linked yet",
      tone: "warn" as const,
      who: "Browse to an existing folder or create a new one.",
    };
  }, [stillChecking, diskStatus, onDisk, project.path]);

  const applyFolder = async (pathOverride?: string) => {
    const path =
      (pathOverride ?? location.targetPath).trim() ||
      resolveProjectPath(location.parentFolder, project.name, location.targetPath || undefined);
    if (!path) {
      setMsg("Enter or browse to a folder path first");
      return;
    }

    const res = await fetch("/api/projects/folder-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, project: { ...project, path } }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      exists: boolean;
      path: string;
      message: string;
    };

    updateProject({
      ...project,
      path: data.path || path,
      pathExists: data.exists,
    });

    if (data.exists) {
      setMsg(null);
      setEditing(false);
    } else {
      setMsg(data.message || `Applied ${path} — folder not found. Create it or pick another path.`);
    }
  };

  const createFolder = async () => {
    const path =
      location.targetPath.trim() ||
      resolveProjectPath(location.parentFolder, project.name, location.targetPath || undefined);
    const result = await createProjectFolderOnDisk(path);
    if (result.ok) {
      await applyFolder(path);
    }
    setMsg(result.message);
  };

  if (collapseWhenLinked && onDisk && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-200">{status.label}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500" title={displayPath}>
            {displayPath}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]"
        >
          Change folder
        </button>
      </div>
    );
  }

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
            Folder on your PC
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
            {checking ? "Checking…" : "Re-check"}
          </button>
          {onDisk && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setMsg(null);
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Done
            </button>
          )}
          {pre.shellCommand && (
            <button
              type="button"
              onClick={() => void copyToClipboard(pre.shellCommand!)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
            >
              Copy PowerShell
            </button>
          )}
          {!onDisk && !stillChecking && (
            <button
              type="button"
              onClick={() => void createFolder()}
              className="rounded-full bg-teal-500/90 px-3 py-1.5 text-[10px] font-semibold text-black hover:bg-teal-400"
            >
              Create folder
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 font-mono text-sm text-teal-200/95 break-all">{displayPath}</p>
      {!stillChecking && <p className="mt-2 text-xs text-zinc-500">{status.who}</p>}

      {(editing || !onDisk) && !stillChecking && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <ProjectLocationPicker
            projectName={project.name}
            parentOptions={state.settings.projectsRoots}
            value={location}
            onChange={setLocation}
            mode="link"
            compact
            applyLabel="Apply folder"
            onApply={applyFolder}
          />
        </div>
      )}

      {msg && <p className="mt-2 text-xs text-amber-300">{msg}</p>}
    </div>
  );
}
