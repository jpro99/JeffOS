import fs from "fs";
import path from "path";
import { isAllowedCreatePath } from "@/lib/project-scan/create-folder";

export interface FolderStatusResult {
  ok: boolean;
  exists: boolean;
  path: string;
  isGitRepo: boolean;
  hasPackageJson: boolean;
  topLevelCount: number;
  message: string;
}

export function checkFolderStatus(targetPath: string): FolderStatusResult {
  const normalized = path.normalize(targetPath.trim());

  if (!normalized) {
    return { ok: false, exists: false, path: "", isGitRepo: false, hasPackageJson: false, topLevelCount: 0, message: "No path" };
  }

  if (!isAllowedCreatePath(normalized)) {
    return {
      ok: false,
      exists: false,
      path: normalized,
      isGitRepo: false,
      hasPackageJson: false,
      topLevelCount: 0,
      message: "Path not in allowed project roots",
    };
  }

  if (!fs.existsSync(normalized)) {
    return {
      ok: true,
      exists: false,
      path: normalized,
      isGitRepo: false,
      hasPackageJson: false,
      topLevelCount: 0,
      message: "Folder not found on disk yet",
    };
  }

  let topLevelCount = 0;
  try {
    topLevelCount = fs.readdirSync(normalized).length;
  } catch {
    topLevelCount = 0;
  }

  const hasPackageJson = fs.existsSync(path.join(normalized, "package.json"));
  const isGitRepo = fs.existsSync(path.join(normalized, ".git"));

  return {
    ok: true,
    exists: true,
    path: normalized,
    isGitRepo,
    hasPackageJson,
    topLevelCount,
    message:
      topLevelCount > 0
        ? `Folder on disk — ${topLevelCount} item${topLevelCount === 1 ? "" : "s"}${isGitRepo ? ", git repo" : ""}`
        : "Folder exists (empty)",
  };
}
