"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import type { FolderStatusResult } from "@/lib/project-scan/folder-status";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import { useMissionControl } from "@/lib/store/context";

/** Checks disk and syncs project.path + pathExists in Jeff OS */
export function useFolderSync(project: Project) {
  const { updateProject } = useMissionControl();
  const [status, setStatus] = useState<FolderStatusResult | null>(null);
  const [checking, setChecking] = useState(false);

  const checkPath = project.path?.trim() || suggestProjectFolder(project);

  const applyDiskStatus = (data: FolderStatusResult) => {
    if (!data.ok) return;

    const pathChanged = Boolean(data.path && data.path !== project.path);
    const existsChanged = data.exists !== (project.pathExists === true);

    if (pathChanged || existsChanged || (data.exists && project.pathExists !== true)) {
      updateProject({
        ...project,
        path: data.path || project.path,
        pathExists: data.exists,
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    setChecking(true);

    void fetch("/api/projects/folder-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: checkPath, project }),
    })
      .then((r) => r.json())
      .then((data: FolderStatusResult) => {
        if (cancelled) return;
        setStatus(data);
        applyDiskStatus(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, checkPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const recheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/projects/folder-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: checkPath, project }),
      });
      const data = (await res.json()) as FolderStatusResult;
      setStatus(data);
      applyDiskStatus(data);
      return data;
    } finally {
      setChecking(false);
    }
  };

  return { status, checking, recheck, checkPath };
}
