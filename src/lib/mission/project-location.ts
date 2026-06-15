import path from "path";
import { DEFAULT_PROJECTS_ROOT } from "@/lib/discovery/catalog";

/** Safe Windows folder name from app title */
export function sanitizeFolderName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "New-App";
  return trimmed.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim() || "New-App";
}

export function resolveProjectPath(
  parentFolder: string,
  projectName: string,
  fullPathOverride?: string,
): string {
  const override = fullPathOverride?.trim();
  if (override) return path.normalize(override);
  const parent = (parentFolder.trim() || DEFAULT_PROJECTS_ROOT).replace(/[/\\]+$/, "");
  const folder = sanitizeFolderName(projectName);
  return path.normalize(`${parent}\\${folder}`);
}

export function folderNameFromPath(fullPath: string): string {
  return path.basename(fullPath.trim());
}

export const COMMON_PARENT_FOLDERS = [
  DEFAULT_PROJECTS_ROOT,
  "C:\\Users\\Jeff Russell\\Desktop",
  "C:\\vercel generator",
] as const;

export function mkdirShellCommand(fullPath: string): string {
  return `mkdir "${fullPath}" -Force; cursor "${fullPath}"`;
}
