import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { repoPath } from "@/lib/project-scan/repo-root";
const execFileAsync = promisify(execFile);

export interface BrowseFolderResult {
  ok: boolean;
  path?: string;
  cancelled?: boolean;
  message: string;
}

/** Opens Windows folder picker — localhost + npm run dev only */
export async function browseFolderOnWindows(initialPath?: string): Promise<BrowseFolderResult> {
  if (process.platform !== "win32") {
    return { ok: false, message: "Folder browse only works on Windows with npm run dev" };
  }

  const scriptPath = repoPath("scripts", "browse-folder.ps1");
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, message: "browse-folder.ps1 not found" };
  }

  const args = ["-ExecutionPolicy", "Bypass", "-File", scriptPath];
  if (initialPath?.trim()) {
    args.push("-InitialPath", initialPath.trim());
  }

  try {
    const { stdout } = await execFileAsync("powershell.exe", args, {
      timeout: 120_000,
      windowsHide: false,
      maxBuffer: 4096,
    });
    const picked = stdout.trim().split(/\r?\n/).filter(Boolean).pop()?.trim();
    if (!picked) {
      return { ok: true, cancelled: true, message: "Browse cancelled" };
    }
    return { ok: true, path: path.normalize(picked), message: `Selected ${picked}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browse failed";
    return { ok: false, message };
  }
}
