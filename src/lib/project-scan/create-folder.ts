import fs from "fs";
import path from "path";
import os from "os";
import { isAllowedProjectPath } from "@/lib/project-scan/allowed-paths";

function isAllowedCreatePath(target: string): boolean {
  if (isAllowedProjectPath(target)) return true;
  const normalized = path.normalize(target).toLowerCase();
  const desktop = path.normalize(path.join(os.homedir(), "Desktop")).toLowerCase();
  const documents = path.normalize(path.join(os.homedir(), "Documents")).toLowerCase();
  return normalized.startsWith(desktop) || normalized.startsWith(documents);
}

export interface CreateFolderResult {
  ok: boolean;
  message: string;
  path?: string;
  created?: boolean;
}

/** Create project folder on disk — localhost API only */
export async function createProjectFolder(targetPath: string): Promise<CreateFolderResult> {
  const normalized = path.normalize(targetPath.trim());

  if (!normalized) {
    return { ok: false, message: "No path provided" };
  }

  if (!isAllowedCreatePath(normalized)) {
    return {
      ok: false,
      message: "Path must be under your allowed project roots (Settings → scan roots)",
    };
  }

  const existed = fs.existsSync(normalized);
  fs.mkdirSync(normalized, { recursive: true });

  return {
    ok: true,
    created: !existed,
    path: normalized,
    message: existed
      ? `Folder already exists — opened path ${normalized}`
      : `Created ${normalized}`,
  };
}
