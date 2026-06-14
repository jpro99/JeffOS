import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import type { FolderScan } from "@/lib/project-scan/analyze";
import { uid } from "@/lib/utils";

const execAsync = promisify(exec);

export interface VerifyIssue {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  source: "build" | "lint" | "typecheck" | "scan";
}

export interface VerifyCheck {
  name: string;
  label: string;
  command: string;
  passed: boolean;
  skipped?: boolean;
  skipReason?: string;
  output: string;
  issues: VerifyIssue[];
}

export interface VerifyResult {
  verifiedAt: string;
  projectPath: string;
  checks: VerifyCheck[];
  buildPassed: boolean;
  lintPassed: boolean | null;
  openIssues: VerifyIssue[];
  buildLogTail: string;
  summary: string;
}

function logTail(output: string, lines = 12): string {
  return output
    .split("\n")
    .filter((l) => l.trim())
    .slice(-lines)
    .join("\n")
    .slice(0, 1200);
}

function verifyEnv(script: "build" | "lint"): NodeJS.ProcessEnv {
  const env = { ...process.env };
  // Don't inherit Jeff OS dev-server turbopack flags into child project builds
  delete env.TURBOPACK;
  delete env.NEXT_PRIVATE_TURBOPACK;
  delete env.__NEXT_PRIVATE_TURBO;
  if (script === "build") {
    env.NODE_ENV = "production";
  }
  env.CI = "true";
  env.FORCE_COLOR = "0";
  env.NO_COLOR = "1";
  return env;
}

async function runNpmScript(
  cwd: string,
  script: "build" | "lint",
  timeoutMs = 180_000,
): Promise<{ ok: boolean; output: string; spawnFailed?: boolean }> {
  if (!fs.existsSync(cwd)) {
    return { ok: false, output: `Project folder not found: ${cwd}` };
  }

  const command = `npm run ${script}`;
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 6 * 1024 * 1024,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      env: verifyEnv(script),
    });
    return { ok: true, output: `${stdout}\n${stderr}`.trim() };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: string | number;
    };
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
    const spawnFailed = /spawn EINVAL|ENOENT.*npm/i.test(output);
    return {
      ok: false,
      output: output || `npm run ${script} exited with code ${err.code ?? "1"}`,
      spawnFailed,
    };
  }
}

function pushIssue(
  issues: VerifyIssue[],
  seen: Set<string>,
  partial: Omit<VerifyIssue, "id">,
): void {
  if (seen.has(partial.title)) return;
  seen.add(partial.title);
  issues.push({ ...partial, id: uid("verify") });
}

function isNoiseLine(trimmed: string): boolean {
  if (/^\s*at\s+/i.test(trimmed)) return true;
  if (/node_modules[/\\]/i.test(trimmed)) return true;
  if (/^Command failed:/i.test(trimmed)) return true;
  if (/^>\s+\S/.test(trimmed)) return true;
  if (/^⚠\s|^Warning:/i.test(trimmed)) return true;
  if (/^npm ERR!/i.test(trimmed)) return true;
  return false;
}

function isProjectPath(filePath: string): boolean {
  return !/node_modules[/\\]/i.test(filePath);
}

function parseBuildOutput(output: string, source: VerifyIssue["source"]): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const seen = new Set<string>();

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || isNoiseLine(trimmed)) continue;

    const explicitErr = trimmed.match(/^Error:\s*(.+)$/i);
    if (explicitErr) {
      pushIssue(issues, seen, {
        title: explicitErr[1].slice(0, 140),
        detail: trimmed,
        severity: "critical",
        source,
      });
      continue;
    }

    const tsMatch = trimmed.match(/error TS(\d+):\s*(.+)/i);
    if (tsMatch) {
      pushIssue(issues, seen, {
        title: `TypeScript TS${tsMatch[1]}: ${tsMatch[2].slice(0, 120)}`,
        detail: trimmed,
        severity: "high",
        source,
      });
      continue;
    }

    const nextMatch = trimmed.match(
      /^(?:Error:\s*)?(?:×\s*)?(.+\.(?:tsx?|jsx?|mjs|cjs|vue|svelte|css|scss)):(\d+):(\d+)/i,
    );
    if (nextMatch && isProjectPath(nextMatch[1])) {
      pushIssue(issues, seen, {
        title: `${path.basename(nextMatch[1])}:${nextMatch[2]} — ${nextMatch[1].replace(/\\/g, "/").split("/").slice(-2).join("/")}`,
        detail: trimmed,
        severity: "high",
        source,
      });
      continue;
    }

    const fileMatch = trimmed.match(
      /^(.+\.(?:tsx?|jsx?|vue|svelte|css|scss))\:(\d+)\:(\d+)\s*[-–]?\s*(?:error|Error)\s*(.+)$/i,
    );
    if (fileMatch && isProjectPath(fileMatch[1])) {
      pushIssue(issues, seen, {
        title: `${path.basename(fileMatch[1])}:${fileMatch[2]} — ${fileMatch[4].slice(0, 100)}`,
        detail: trimmed,
        severity: "high",
        source,
      });
      continue;
    }

    if (/^Module not found:|Cannot find module/i.test(trimmed) && isProjectPath(trimmed)) {
      pushIssue(issues, seen, {
        title: trimmed.slice(0, 140),
        detail: trimmed,
        severity: "high",
        source,
      });
      continue;
    }

    if (/Failed to compile/i.test(trimmed)) {
      pushIssue(issues, seen, {
        title: "Failed to compile",
        detail: trimmed,
        severity: "critical",
        source,
      });
    }
  }

  if (issues.length === 0) {
    const tail = logTail(output, 10);
    if (tail) {
      pushIssue(issues, seen, {
        title: "npm run build failed — see log below",
        detail: tail,
        severity: "critical",
        source,
      });
    }
  }

  return issues.slice(0, 6);
}

function hasScript(scan: FolderScan, name: string): boolean {
  return scan.scripts.includes(name);
}

function buildSummary(
  buildPassed: boolean,
  lintPassed: boolean | null,
  openIssues: VerifyIssue[],
): string {
  if (!buildPassed) {
    const n = openIssues.filter((i) => i.source === "build" || i.source === "scan").length;
    return n > 0
      ? `Build failed — ${n} error line(s) captured from npm run build`
      : "Build failed — check log below (npm exited non-zero)";
  }
  if (lintPassed === false) {
    const n = openIssues.filter((i) => i.source === "lint").length;
    return `Build OK — lint failed (${n} issue(s))`;
  }
  return "Build verify passed — npm run build succeeded";
}

/** Run build (+ lint when available) against project on disk. Local dev only. */
export async function verifyProjectBuild(
  folderPath: string,
  scan: FolderScan,
): Promise<VerifyResult> {
  const verifiedAt = new Date().toISOString();
  const checks: VerifyCheck[] = [];

  if (!scan.exists) {
    const issue: VerifyIssue = {
      id: uid("verify"),
      title: "Project folder missing",
      detail: folderPath,
      severity: "critical",
      source: "scan",
    };
    return {
      verifiedAt,
      projectPath: folderPath,
      checks: [
        {
          name: "folder",
          label: "Project folder",
          command: "(none)",
          passed: false,
          output: "Folder not found",
          issues: [issue],
        },
      ],
      buildPassed: false,
      lintPassed: null,
      openIssues: [issue],
      buildLogTail: folderPath,
      summary: "Folder missing — cannot verify build",
    };
  }

  if (!scan.hasPackageJson) {
    const sln = scan.topLevel.find((e) => e.endsWith(".sln"));
    if (sln) {
      return {
        verifiedAt,
        projectPath: folderPath,
        checks: [
          {
            name: "dotnet",
            label: ".NET build",
            command: "(manual)",
            passed: true,
            skipped: true,
            skipReason: "Auto-verify is npm-only today — run dotnet build locally",
            output: "",
            issues: [],
          },
        ],
        buildPassed: true,
        lintPassed: null,
        openIssues: [],
        buildLogTail: "",
        summary: ".NET project — npm verify skipped. Check build manually.",
      };
    }

    return {
      verifiedAt,
      projectPath: folderPath,
      checks: [],
      buildPassed: true,
      lintPassed: null,
      openIssues: [],
      buildLogTail: "",
      summary: "No package.json — skipped build verify",
    };
  }

  let buildLogTail = "";

  if (hasScript(scan, "build")) {
    const result = await runNpmScript(folderPath, "build");
    buildLogTail = logTail(result.output);

    if (result.spawnFailed) {
      checks.push({
        name: "build",
        label: "npm run build",
        command: "npm run build",
        passed: false,
        output: result.output,
        issues: [
          {
            id: uid("verify"),
            title: "Could not run npm on this machine",
            detail: result.output,
            severity: "critical",
            source: "scan",
          },
        ],
      });
    } else {
      let issues = result.ok ? [] : parseBuildOutput(result.output, "build");
      if (!result.ok && issues.length === 0) {
        issues = [
          {
            id: uid("verify"),
            title: "npm run build failed",
            detail: buildLogTail || "No output — check path and dependencies",
            severity: "critical",
            source: "build",
          },
        ];
      }
      checks.push({
        name: "build",
        label: "npm run build",
        command: "npm run build",
        passed: result.ok,
        output: result.output.slice(-4000),
        issues,
      });
    }
  } else {
    checks.push({
      name: "build",
      label: "npm run build",
      command: "(none)",
      passed: true,
      skipped: true,
      skipReason: "No build script in package.json",
      output: "",
      issues: [],
    });
  }

  const buildCheck = checks.find((c) => c.name === "build");
  const buildSpawnFailed = buildCheck?.issues.some((i) =>
    i.title.includes("Could not run npm"),
  );

  if (hasScript(scan, "lint") && !buildSpawnFailed && buildCheck?.passed) {
    const result = await runNpmScript(folderPath, "lint", 120_000);
    const issues = result.ok ? [] : parseBuildOutput(result.output, "lint");
    checks.push({
      name: "lint",
      label: "npm run lint",
      command: "npm run lint",
      passed: result.ok,
      output: result.output.slice(-3000),
      issues,
    });
  } else if (hasScript(scan, "lint") && buildCheck && !buildCheck.passed && !buildSpawnFailed) {
    checks.push({
      name: "lint",
      label: "npm run lint",
      command: "(skipped)",
      passed: true,
      skipped: true,
      skipReason: "Skipped — fix build first",
      output: "",
      issues: [],
    });
  }

  const lintCheck = checks.find((c) => c.name === "lint");
  const buildPassed = buildCheck ? buildCheck.passed || Boolean(buildCheck.skipped) : true;
  const lintPassed = lintCheck ? (lintCheck.skipped ? null : lintCheck.passed) : null;
  const openIssues = checks.flatMap((c) => c.issues);

  return {
    verifiedAt,
    projectPath: folderPath,
    checks,
    buildPassed,
    lintPassed,
    openIssues,
    buildLogTail,
    summary: buildSummary(buildPassed, lintPassed, openIssues),
  };
}
