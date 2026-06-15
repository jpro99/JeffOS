import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { isAllowedCreatePath } from "@/lib/project-scan/create-folder";
import { detectRepoProfile, isAllowedProjectCommand } from "@/lib/project-scan/detect-repo";
import { DEFAULT_REPO_PROFILE } from "@/lib/project-scan/repo-profile";

const execAsync = promisify(exec);

export interface RunCommandResult {
  ok: boolean;
  command: string;
  cwd: string;
  exitCode: number | null;
  output: string;
  message: string;
  durationMs: number;
  buildCommand?: string;
}

function childEnv(isBuild: boolean): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.TURBOPACK;
  delete env.NEXT_PRIVATE_TURBOPACK;
  delete env.__NEXT_PRIVATE_TURBO;
  env.FORCE_COLOR = "0";
  env.NO_COLOR = "1";
  if (isBuild) {
    env.NODE_ENV = "production";
    env.CI = "true";
  }
  return env;
}

export function isAllowedShellCommand(command: string): boolean {
  return isAllowedProjectCommand(command);
}

export function resolveBuildCommand(cwd: string): string {
  return detectRepoProfile(cwd).buildCommand;
}

export async function runProjectCommand(cwd: string, command: string): Promise<RunCommandResult> {
  const normalized = path.normalize(cwd.trim());
  const trimmed = command.trim();

  if (!normalized) {
    return { ok: false, command: trimmed, cwd: "", exitCode: null, output: "", message: "No project path", durationMs: 0 };
  }

  if (!isAllowedCreatePath(normalized)) {
    return {
      ok: false,
      command: trimmed,
      cwd: normalized,
      exitCode: null,
      output: "",
      message: "Path not in allowed project roots",
      durationMs: 0,
    };
  }

  if (!fs.existsSync(normalized)) {
    return {
      ok: false,
      command: trimmed,
      cwd: normalized,
      exitCode: null,
      output: "",
      message: `Folder not found: ${normalized}`,
      durationMs: 0,
    };
  }

  if (!isAllowedShellCommand(trimmed)) {
    return {
      ok: false,
      command: trimmed,
      cwd: normalized,
      exitCode: null,
      output: "",
      message: "Command not allowed — use npm/pnpm run build, lint, install, git status, etc.",
      durationMs: 0,
    };
  }

  const isBuild = trimmed.includes("build");
  const timeoutMs = trimmed === "npm run dev" ? 8_000 : isBuild ? 180_000 : 60_000;
  const started = Date.now();

  try {
    const { stdout, stderr } = await execAsync(trimmed, {
      cwd: normalized,
      timeout: timeoutMs,
      maxBuffer: 6 * 1024 * 1024,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      env: childEnv(isBuild),
    });
    const output = [stdout, stderr].filter(Boolean).join("\n").trim();
    return {
      ok: true,
      command: trimmed,
      cwd: normalized,
      exitCode: 0,
      output: output || "(no output)",
      message: trimmed === "npm run dev" ? "Dev server started — stop it in your own terminal if needed" : "Done",
      durationMs: Date.now() - started,
      buildCommand: trimmed,
    };
  } catch (error) {
    const err = error as { code?: number; stdout?: string; stderr?: string; message?: string };
    const output = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    return {
      ok: false,
      command: trimmed,
      cwd: normalized,
      exitCode: typeof err.code === "number" ? err.code : 1,
      output: output || err.message || "Command failed",
      message: "Command finished with errors — paste output into Paste & fix",
      durationMs: Date.now() - started,
      buildCommand: trimmed,
    };
  }
}

export async function runDetectedBuild(cwd: string): Promise<RunCommandResult> {
  const buildCommand = resolveBuildCommand(cwd);
  return runProjectCommand(cwd, buildCommand);
}
