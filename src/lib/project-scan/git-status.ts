import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface GitStatusSnapshot {
  ok: boolean;
  repoPath: string;
  isRepo: boolean;
  branch: string;
  hasRemote: boolean;
  remoteUrl: string;
  clean: boolean;
  changedFiles: number;
  ahead: number;
  behind: number;
  lastCommit: string;
  summary: string;
  error?: string;
}

async function runGit(cwd: string, args: string): Promise<string> {
  const { stdout } = await execAsync(`git ${args}`, {
    cwd,
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
    maxBuffer: 512 * 1024,
  });
  return stdout.trim();
}

/** Read-only git snapshot — local dev only. */
export async function readGitStatus(folderPath: string): Promise<GitStatusSnapshot> {
  const base: GitStatusSnapshot = {
    ok: false,
    repoPath: folderPath,
    isRepo: false,
    branch: "",
    hasRemote: false,
    remoteUrl: "",
    clean: true,
    changedFiles: 0,
    ahead: 0,
    behind: 0,
    lastCommit: "",
    summary: "No git repo",
  };

  if (!folderPath || !fs.existsSync(folderPath)) {
    return { ...base, error: "Folder not found" };
  }

  const gitDir = path.join(folderPath, ".git");
  if (!fs.existsSync(gitDir)) {
    return { ...base, summary: "Not a git repo — init or clone first" };
  }

  try {
    const branch = await runGit(folderPath, "rev-parse --abbrev-ref HEAD");
    let remoteUrl = "";
    try {
      remoteUrl = await runGit(folderPath, "remote get-url origin");
    } catch {
      /* no origin */
    }
    const statusPorcelain = await runGit(folderPath, "status --porcelain");
    const changedFiles = statusPorcelain ? statusPorcelain.split("\n").filter(Boolean).length : 0;
    let ahead = 0;
    let behind = 0;
    if (remoteUrl) {
      try {
        const counts = await runGit(folderPath, "rev-list --left-right --count HEAD...@{u}");
        const parts = counts.split(/\s+/);
        ahead = Number(parts[0]) || 0;
        behind = Number(parts[1]) || 0;
      } catch {
        /* no upstream */
      }
    }
    let lastCommit = "";
    try {
      lastCommit = await runGit(folderPath, "log -1 --format=%h %s");
    } catch {
      /* empty repo */
    }

    const clean = changedFiles === 0;
    const hasRemote = Boolean(remoteUrl);

    let summary: string;
    if (!hasRemote) {
      summary = "Git repo — no GitHub remote linked";
    } else if (!clean && ahead === 0) {
      summary = `${changedFiles} uncommitted change(s) — commit before push`;
    } else if (clean && ahead > 0) {
      summary = `${ahead} commit(s) ready to push to GitHub`;
    } else if (clean && ahead === 0 && behind === 0) {
      summary = "Clean — matches GitHub (Vercel may auto-deploy on push)";
    } else if (clean && behind > 0) {
      summary = `Clean locally — ${behind} commit(s) behind remote (pull first)`;
    } else {
      summary = `${changedFiles} changed · ${ahead} ahead · ${behind} behind`;
    }

    return {
      ok: true,
      isRepo: true,
      repoPath: folderPath,
      branch,
      hasRemote,
      remoteUrl,
      clean,
      changedFiles,
      ahead,
      behind,
      lastCommit,
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Git read failed";
    return { ...base, isRepo: true, error: message, summary: message };
  }
}
