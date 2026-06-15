import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { isAllowedProjectPath } from "@/lib/project-scan/allowed-paths";

const execFileAsync = promisify(execFile);

export interface PushLiveResult {
  ok: boolean;
  message: string;
  branch?: string;
  commit?: string;
  nothingToCommit?: boolean;
  buildSkipped?: boolean;
}

function hasBuildScript(projectPath: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf8")) as {
      scripts?: { build?: string };
    };
    return Boolean(pkg.scripts?.build);
  } catch {
    return false;
  }
}

async function run(cwd: string, cmd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(cmd, args, {
    cwd,
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  return stdout.trim();
}

/** Server-side push — only when npm run dev (localhost API) */
export async function executePushLive(
  projectPath: string,
  message: string,
): Promise<PushLiveResult> {
  if (!isAllowedProjectPath(projectPath)) {
    return { ok: false, message: "Path not in allowed project roots" };
  }
  if (!fs.existsSync(projectPath)) {
    return { ok: false, message: "Folder not found on disk" };
  }

  const gitDir = path.join(projectPath, ".git");
  if (!fs.existsSync(gitDir)) {
    return { ok: false, message: "Not a git repo — init or clone first" };
  }

  let buildSkipped = true;
  if (hasBuildScript(projectPath)) {
    buildSkipped = false;
    try {
      await run(projectPath, "npm.cmd", ["run", "build"]);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Build failed";
      return { ok: false, message: `Build failed — fix before push. ${err.slice(0, 200)}` };
    }
  }

  const status = await run(projectPath, "git", ["status", "--porcelain"]);
  if (!status) {
    return {
      ok: true,
      nothingToCommit: true,
      buildSkipped,
      message: "Nothing to commit — already up to date on disk",
    };
  }

  await run(projectPath, "git", ["add", "-A"]);
  await run(projectPath, "git", ["commit", "-m", message]);

  let branch = "main";
  try {
    branch = await run(projectPath, "git", ["branch", "--show-current"]);
  } catch {
    /* ignore */
  }

  try {
    await run(projectPath, "git", ["push", "origin", branch]);
  } catch {
    try {
      await run(projectPath, "git", ["push"]);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Push failed";
      return { ok: false, message: `Commit ok but push failed: ${err.slice(0, 240)}` };
    }
  }

  let commit = "";
  try {
    commit = await run(projectPath, "git", ["log", "-1", "--oneline"]);
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    branch,
    commit,
    buildSkipped,
    message: `Pushed ${branch} — Vercel auto-deploys if linked (~1–2 min)`,
  };
}
