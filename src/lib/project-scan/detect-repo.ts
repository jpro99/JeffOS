import "server-only";
import fs from "fs";
import path from "path";
import {
  DEFAULT_REPO_PROFILE,
  detectRepoProfileFromSignals,
  type RepoProfile,
} from "@/lib/project-scan/repo-profile";

export type { PackageManager, RepoKind, RepoProfile } from "@/lib/project-scan/repo-profile";
export {
  DEFAULT_REPO_PROFILE,
  detectRepoProfileFromSignals,
  isAllowedProjectCommand,
} from "@/lib/project-scan/repo-profile";

/** Read package.json + workspace signals from disk — server/local only. */
export function detectRepoProfile(folderPath: string): RepoProfile {
  if (!folderPath?.trim() || !fs.existsSync(folderPath)) {
    return DEFAULT_REPO_PROFILE;
  }

  const normalized = path.normalize(folderPath.trim());
  const hasPackageJson = fs.existsSync(path.join(normalized, "package.json"));
  const hasTurboJson = fs.existsSync(path.join(normalized, "turbo.json"));
  const hasPnpmWorkspace = fs.existsSync(path.join(normalized, "pnpm-workspace.yaml"));
  const entries = fs.readdirSync(normalized);
  const hasSln = entries.some((e) => e.endsWith(".sln"));

  if (!hasPackageJson) {
    return detectRepoProfileFromSignals({ folderPath: normalized, hasSln, hasPackageJson: false });
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(normalized, "package.json"), "utf8")) as {
      packageManager?: string;
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    return detectRepoProfileFromSignals({
      folderPath: normalized,
      packageManagerField: pkg.packageManager,
      scripts: pkg.scripts,
      devDependencies: pkg.devDependencies,
      dependencies: pkg.dependencies,
      hasTurboJson,
      hasPnpmWorkspace,
      hasPackageJson: true,
      hasSln,
    });
  } catch {
    return DEFAULT_REPO_PROFILE;
  }
}
