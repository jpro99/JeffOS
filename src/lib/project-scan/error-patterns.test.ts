import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectRepoProfileFromSignals } from "./repo-profile";
import {
  analyzeBuildLog,
  matchErrorPattern,
  parseBuildLogIssues,
} from "./error-patterns";
import { isSuccessfulBuildOutput } from "../mission/build-output";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(__dirname, "__fixtures__", "turbo-monorepo-no-pm.txt"), "utf8");

const turboMonorepoProfile = detectRepoProfileFromSignals({
  folderPath: "C:\\Projects\\ExampleMonorepo",
  packageManagerField: "pnpm@9.15.0",
  scripts: { build: "turbo run build", lint: "turbo run lint" },
  devDependencies: { turbo: "2.0.0" },
  hasTurboJson: true,
  hasPnpmWorkspace: true,
  hasPackageJson: true,
});

describe("detectRepoProfileFromSignals", () => {
  it("detects turbo monorepo with pnpm", () => {
    assert.equal(turboMonorepoProfile.repoKind, "turbo-monorepo");
    assert.equal(turboMonorepoProfile.packageManager, "pnpm");
    assert.equal(turboMonorepoProfile.buildCommand, "pnpm run build");
    assert.equal(turboMonorepoProfile.installCommand, "pnpm install");
    assert.equal(turboMonorepoProfile.hasTurbo, true);
  });
});

describe("error-patterns — turbo monorepo fixture (Jeff OS)", () => {
  const ctx = {
    repoPath: "C:\\Projects\\ExampleMonorepo",
    repoProfile: turboMonorepoProfile,
  };

  it("does not treat turbo PM failure as successful build", () => {
    assert.equal(isSuccessfulBuildOutput(FIXTURE), false);
  });

  it("matches turbo-package-manager-missing pattern", () => {
    const matched = matchErrorPattern(FIXTURE, ctx);
    assert.ok(matched);
    assert.equal(matched!.patternId, "turbo-package-manager-missing");
    assert.equal(matched!.fixType, "toolchain");
    assert.equal(matched!.doNotRewriteAppCode, true);
    assert.match(matched!.headline, /package manager not found/i);
  });

  it("analyzeBuildLog returns pnpm/corepack commands", () => {
    const analysis = analyzeBuildLog(FIXTURE, ctx);
    assert.equal(analysis.kind, "npm");
    assert.match(analysis.summary, /pnpm/i);
    assert.ok(analysis.runCommands.some((c) => c.includes("corepack enable")));
    assert.ok(analysis.runCommands.some((c) => c.includes("pnpm install")));
    assert.ok(analysis.runCommands.some((c) => c.includes("pnpm run build")));
  });

  it("parseBuildLogIssues returns one toolchain issue for verify", () => {
    const issues = parseBuildLogIssues(FIXTURE, ctx, "build");
    assert.equal(issues.length, 1);
    assert.equal(issues[0].patternId, "turbo-package-manager-missing");
    assert.equal(issues[0].fixType, "toolchain");
    assert.match(issues[0].title, /package manager/i);
  });
});

describe("error-patterns — pnpm not on PATH", () => {
  const PM_FIXTURE = readFileSync(
    join(__dirname, "__fixtures__", "pnpm-not-on-path.txt"),
    "utf8",
  );
  const ctx = {
    repoPath: "C:\\Projects\\ExampleMonorepo",
    repoProfile: turboMonorepoProfile,
  };

  it("matches package-manager-not-on-path", () => {
    const matched = matchErrorPattern(PM_FIXTURE, ctx);
    assert.ok(matched);
    assert.equal(matched!.patternId, "package-manager-not-on-path");
    assert.equal(matched!.fixType, "toolchain");
    assert.match(matched!.rootCause, /pnpm/i);
    assert.equal(matched!.doNotRewriteAppCode, true);
  });

  it("analyzeBuildLog returns corepack before pnpm run build", () => {
    const analysis = analyzeBuildLog(PM_FIXTURE, ctx);
    assert.match(analysis.headline, /pnpm not installed|not on PATH/i);
    assert.ok(analysis.runCommands.some((c) => c.includes("corepack enable")));
    assert.ok(analysis.runCommands.some((c) => c.includes("pnpm install")));
    const buildIdx = analysis.runCommands.findIndex((c) => c.includes("pnpm run build"));
    const corepackIdx = analysis.runCommands.findIndex((c) => c.includes("corepack enable"));
    assert.ok(buildIdx > corepackIdx);
  });
});
