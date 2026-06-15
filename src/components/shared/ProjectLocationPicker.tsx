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

export async function browseFolderOnPc(
  initialPath?: string,
): Promise<{ ok: boolean; path?: string; cancelled?: boolean; message: string }> {
  try {
    const res = await fetch("/api/projects/browse-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialPath }),
    });
    return (await res.json()) as { ok: boolean; path?: string; cancelled?: boolean; message: string };
  } catch {
    return { ok: false, message: "Run npm run dev on localhost — then Browse opens a Windows folder picker" };
  }
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

export function ProjectLocationPicker({
  projectName,
  parentOptions,
  value,
  onChange,
  compact,
  mode = "create",
  onApply,
  applyLabel = "Apply folder",
}: {
  projectName: string;
  parentOptions?: string[];
  value: ProjectLocationValue;
  onChange: (next: ProjectLocationValue) => void;
  compact?: boolean;
  mode?: "create" | "link";
  onApply?: (fullPath: string) => void | Promise<void>;
  applyLabel?: string;
}) {
  const [pathEdited, setPathEdited] = useState(false);
  const [customParent, setCustomParent] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [pickerMsg, setPickerMsg] = useState<string | null>(null);

  const roots = useMemo(() => {
    const set = new Set<string>([...COMMON_PARENT_FOLDERS, ...(parentOptions ?? [])]);
    if (value.parentFolder) set.add(value.parentFolder);
    return [...set];
  }, [parentOptions, value.parentFolder]);

  const autoFolder = sanitizeFolderName(projectName);
  const autoPath = resolveProjectPath(value.parentFolder, projectName);
  const fullPath = value.targetPath.trim() || autoPath;

  useEffect(() => {
    if (pathEdited || !projectName.trim()) return;
    const next = resolveProjectPath(value.parentFolder, projectName);
    if (next !== value.targetPath) {
      onChange({ ...value, targetPath: next });
    }
  }, [projectName, value.parentFolder, pathEdited]); // eslint-disable-line react-hooks/exhaustive-deps

  const shellCmd = mkdirShellCommand(fullPath);

  const browse = async () => {
    setBrowsing(true);
    setPickerMsg(null);
    try {
      const result = await browseFolderOnPc(fullPath);
      if (result.cancelled) {
        setPickerMsg("Browse cancelled — path unchanged");
        return;
      }
      if (result.ok && result.path) {
        onChange({
          parentFolder: result.path.replace(/\\[^\\]+$/, "") || value.parentFolder,
          targetPath: result.path,
        });
        setPathEdited(true);
        setPickerMsg(`Picked: ${result.path} — click ${applyLabel} to save`);
      } else {
        setPickerMsg(result.message);
      }
    } finally {
      setBrowsing(false);
    }
  };

  const openInExplorer = async () => {
    if (!fullPath.trim()) return;
    try {
      const res = await fetch("/api/projects/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: fullPath }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setPickerMsg(data.ok ? "Opened in File Explorer" : data.error ?? "Could not open folder");
    } catch {
      setPickerMsg("Run npm run dev locally to open folders");
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4",
        compact && "p-3",
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/90">
          {mode === "link" ? "Update folder on your PC" : "Where to create on your PC"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {mode === "link"
            ? "Moved or renamed the folder? Browse to find it, then Apply folder."
            : "Auto-names folder from app name — or browse / type full path."}
        </p>
      </div>

      {mode === "create" && (
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
      )}

      {mode === "create" && (
        <div className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2">
          <p className="text-[10px] uppercase text-zinc-600">Auto folder name</p>
          <p className="mt-1 font-mono text-sm text-teal-200/90">
            {autoFolder || "— type app name above —"}
          </p>
        </div>
      )}

      <label className="block text-xs text-zinc-600">
        Full path {mode === "link" ? "(your project folder)" : "(override)"}
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void browse()}
          disabled={browsing}
          className="rounded-full bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {browsing ? "Opening picker…" : "Browse on my PC"}
        </button>
        {onApply && (
          <button
            type="button"
            onClick={() => void onApply(fullPath)}
            className="rounded-full bg-teal-500 px-5 py-2.5 text-xs font-semibold text-black hover:bg-teal-400"
          >
            {applyLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => void openInExplorer()}
          className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Open in Explorer
        </button>
      </div>

      {pathEdited && mode === "create" && (
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

      <p className="font-mono text-[11px] text-teal-200/80 break-all">Will use: {fullPath}</p>

      {mode === "create" && (
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
      )}

      {pickerMsg && <p className="text-xs text-teal-400">{pickerMsg}</p>}
    </div>
  );
}
