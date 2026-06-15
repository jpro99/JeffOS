import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { isAllowedCreatePath } from "@/lib/project-scan/create-folder";

const execAsync = promisify(exec);

const ALLOWED_PATTERNS: RegExp[] = [
  /^npm run build$/,
  /^npm run lint$/,
  /^npm run dev$/,
  /^npm test$/,
  /^npx tsc --noEmit$/,
  /^git status$/,
  /^git log -1$/,
  /^git diff --stat$/,
  /^git branch$/,
];

export interface RunCommandResult {
  ok: boolean;
  command: string;
  cwd: string;
  exitCode: number | null;
  output: string;
  message: string;
  durationMs: number;
}

function childEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.TURBOPACK;
  delete env.NEXT_PRIVATE_TURBOPACK;
  delete env.__NEXT_PRIVATE_TURBO;
  env.FORCE_COLOR = "0";
  env.NO_COLOR = "1";
  return env;
}

export function isAllowedShellCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (/[;&|`$<>]/.test(trimmed)) return false;
  return ALLOWED_PATTERNS.some((p) => p.test(trimmed));
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
      message: "Command not allowed — use npm run build, npm run lint, git status, etc.",
      durationMs: 0,
    };
  }

  const timeoutMs = trimmed === "npm run dev" ? 8_000 : trimmed.includes("build") ? 180_000 : 60_000;
  const started = Date.now();

  try {
    const { stdout, stderr } = await execAsync(trimmed, {
      cwd: normalized,
      timeout: timeoutMs,
      maxBuffer: 6 * 1024 * 1024,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      env: trimmed.includes("build") ? { ...childEnv(), CI: "true", NODE_ENV: "production" } : childEnv(),
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
    };
  }
}
