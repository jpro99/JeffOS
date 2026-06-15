"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COMMON_PARENT_FOLDERS,
  mkdirShellCommand,
  resolveProjectPath,
  sanitizeFolderName,
} from "@/lib/mission/project-location";
import { cn, copyToClipboard } from "@/lib/utils";

export interface ProjectLocationValue {
  parentFolder: string;
  targetPath: string;
}

export function ProjectLocationPicker({
  projectName,
  parentOptions,
  value,
  onChange,
  compact,
}: {
  projectName: string;
  parentOptions?: string[];
  value: ProjectLocationValue;
  onChange: (next: ProjectLocationValue) => void;
  compact?: boolean;
}) {
  const [pathEdited, setPathEdited] = useState(false);
  const [customParent, setCustomParent] = useState(false);

  const roots = useMemo(() => {
    const set = new Set<string>([...COMMON_PARENT_FOLDERS, ...(parentOptions ?? [])]);
    if (value.parentFolder) set.add(value.parentFolder);
    return [...set];
  }, [parentOptions, value.parentFolder]);

  const autoFolder = sanitizeFolderName(projectName);
  const autoPath = resolveProjectPath(value.parentFolder, projectName);

  useEffect(() => {
    if (pathEdited || !projectName.trim()) return;
    const next = resolveProjectPath(value.parentFolder, projectName);
    if (next !== value.targetPath) {
      onChange({ ...value, targetPath: next });
    }
  }, [projectName, value.parentFolder, pathEdited]); // eslint-disable-line react-hooks/exhaustive-deps

  const shellCmd = mkdirShellCommand(value.targetPath || autoPath);

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4",
        compact && "p-3",
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/90">
          Where to create on your PC
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Auto-names folder from your app name — override anytime.
        </p>
      </div>

      <label className="block text-xs text-zinc-600">
        Create inside (parent folder)
        {!customParent ? (
          <select
            value={value.parentFolder}
            onChange={(e) => {
              if (e.target.value === "__custom__") {
                setCustomParent(true);
                return;
              }
              setPathEdited(false);
              onChange({
                parentFolder: e.target.value,
                targetPath: resolveProjectPath(e.target.value, projectName),
              });
            }}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-zinc-200"
          >
            {roots.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="__custom__">Custom path…</option>
          </select>
        ) : (
          <input
            value={value.parentFolder}
            onChange={(e) => {
              setPathEdited(false);
              onChange({
                parentFolder: e.target.value,
                targetPath: resolveProjectPath(e.target.value, projectName),
              });
            }}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-zinc-200"
            placeholder="C:\Projects"
          />
        )}
      </label>

      <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
        <p className="text-[10px] uppercase text-zinc-600">Auto folder name</p>
        <p className="mt-1 font-mono text-sm text-teal-200/90">
          {autoFolder || "— type app name above —"}
        </p>
      </div>

      <label className="block text-xs text-zinc-600">
        Full path (override)
        <input
          value={value.targetPath}
          onChange={(e) => {
            setPathEdited(true);
            onChange({ ...value, targetPath: e.target.value });
          }}
          className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm text-zinc-200"
          placeholder={autoPath}
        />
      </label>

      {pathEdited && (
        <button
          type="button"
          onClick={() => {
            setPathEdited(false);
            onChange({
              ...value,
              targetPath: resolveProjectPath(value.parentFolder, projectName),
            });
          }}
          className="text-[10px] text-teal-600 hover:underline"
        >
          Reset path from app name
        </button>
      )}

      <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
        <p className="text-[10px] uppercase text-zinc-600">PowerShell (creates folder + opens Cursor)</p>
        <pre className="mt-1 overflow-x-auto font-mono text-[10px] text-zinc-500">{shellCmd}</pre>
        <button
          type="button"
          onClick={() => void copyToClipboard(shellCmd)}
          className="mt-2 text-[10px] text-teal-500 hover:underline"
        >
          Copy command
        </button>
      </div>
    </div>
  );
}

/** Create folder via localhost API; no-op message on public site */
export async function createProjectFolderOnDisk(
  targetPath: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch("/api/projects/create-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: targetPath }),
    });
    const data = (await res.json()) as { ok: boolean; message: string };
    return data;
  } catch {
    return { ok: false, message: "Run npm run dev locally — or copy the PowerShell command" };
  }
}
