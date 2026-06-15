import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import type { FolderScan } from "@/lib/project-scan/analyze";
import { detectRepoProfile } from "@/lib/project-scan/detect-repo";
import { parseBuildLogIssues } from "@/lib/project-scan/error-patterns";
import { uid } from "@/lib/utils";

const execAsync = promisify(exec);

export interface VerifyIssue {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  source: "build" | "lint" | "typecheck" | "scan";
  patternId?: string;
  fixType?: "toolchain" | "code" | "config" | "env";
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
  commandOverride?: string,
  timeoutMs = 180_000,
): Promise<{ ok: boolean; output: string; spawnFailed?: boolean; command: string }> {
  if (!fs.existsSync(cwd)) {
    return { ok: false, output: `Project folder not found: ${cwd}`, command: commandOverride ?? `npm run ${script}` };
  }

  const command = commandOverride ?? `npm run ${script}`;
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 6 * 1024 * 1024,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      env: verifyEnv(script),
    });
    return { ok: true, output: `${stdout}\n${stderr}`.trim(), command };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      code?: string | number;
    };
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
    const spawnFailed = /spawn EINVAL|ENOENT.*npm|ENOENT.*pnpm/i.test(output);
    return {
      ok: false,
      output: output || `npm run ${script} exited with code ${err.code ?? "1"}`,
      spawnFailed,
      command,
    };
  }
}

function parseBuildOutput(
  output: string,
  source: VerifyIssue["source"],
  folderPath: string,
  repoProfile: ReturnType<typeof detectRepoProfile>,
): VerifyIssue[] {
  return parseBuildLogIssues(output, { repoPath: folderPath, repoProfile }, source).map((p) => ({
    id: uid("verify"),
    title: p.title,
    detail: p.detail,
    severity: p.severity,
    source: p.source,
    patternId: p.patternId,
    fixType: p.fixType,
  }));
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
  const repoProfile = scan.repoProfile ?? detectRepoProfile(folderPath);
  const buildCommand = repoProfile.buildCommand;
  const lintCommand = repoProfile.lintCommand ?? "npm run lint";

  if (hasScript(scan, "build")) {
    const result = await runNpmScript(folderPath, "build", buildCommand);
    buildLogTail = logTail(result.output);

    if (result.spawnFailed) {
      checks.push({
        name: "build",
        label: buildCommand,
        command: buildCommand,
        passed: false,
        output: result.output,
        issues: [
          {
            id: uid("verify"),
            title: "Could not run build command on this machine",
            detail: result.output,
            severity: "critical",
            source: "scan",
          },
        ],
      });
    } else {
      let issues = result.ok
        ? []
        : parseBuildOutput(result.output, "build", folderPath, repoProfile);
      if (!result.ok && issues.length === 0) {
        issues = [
          {
            id: uid("verify"),
            title: `${buildCommand} failed`,
            detail: buildLogTail || "No output — check path and dependencies",
            severity: "critical",
            source: "build",
          },
        ];
      }
      checks.push({
        name: "build",
        label: buildCommand,
        command: buildCommand,
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
    const result = await runNpmScript(folderPath, "lint", lintCommand, 120_000);
    const issues = result.ok
      ? []
      : parseBuildOutput(result.output, "lint", folderPath, repoProfile);
    checks.push({
      name: "lint",
      label: lintCommand,
      command: lintCommand,
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
