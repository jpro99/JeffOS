export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type RepoKind = "node-app" | "turbo-monorepo" | "dotnet" | "unknown";

export interface RepoProfile {
  repoKind: RepoKind;
  packageManager: PackageManager;
  packageManagerVersion?: string;
  hasTurbo: boolean;
  hasPnpmWorkspace: boolean;
  buildCommand: string;
  installCommand: string;
  lintCommand: string | null;
}

export const DEFAULT_REPO_PROFILE: RepoProfile = {
  repoKind: "node-app",
  packageManager: "npm",
  hasTurbo: false,
  hasPnpmWorkspace: false,
  buildCommand: "npm run build",
  installCommand: "npm install",
  lintCommand: "npm run lint",
};

function parsePackageManagerField(value: unknown): {
  manager: PackageManager;
  version?: string;
} {
  if (typeof value !== "string") return { manager: "npm" };
  const m = value.match(/^(npm|pnpm|yarn|bun)@(.+)$/i);
  if (!m) return { manager: "npm" };
  return { manager: m[1].toLowerCase() as PackageManager, version: m[2] };
}

export function detectRepoProfileFromSignals(input: {
  folderPath: string;
  packageManagerField?: string;
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  hasTurboJson?: boolean;
  hasPnpmWorkspace?: boolean;
  hasPackageJson?: boolean;
  hasSln?: boolean;
}): RepoProfile {
  if (input.hasSln && !input.hasPackageJson) {
    return {
      ...DEFAULT_REPO_PROFILE,
      repoKind: "dotnet",
      buildCommand: "dotnet build",
      installCommand: "dotnet restore",
      lintCommand: null,
    };
  }

  const pm = parsePackageManagerField(input.packageManagerField);
  const hasTurbo =
    Boolean(input.hasTurboJson) ||
    Boolean(input.devDependencies?.turbo || input.dependencies?.turbo) ||
    /turbo run/i.test(input.scripts?.build ?? "");
  const hasPnpmWorkspace = Boolean(input.hasPnpmWorkspace);
  const manager = pm.manager === "npm" && hasPnpmWorkspace ? "pnpm" : pm.manager;

  const repoKind: RepoKind =
    hasTurbo || hasPnpmWorkspace ? "turbo-monorepo" : input.hasPackageJson ? "node-app" : "unknown";

  let buildCommand = "npm run build";
  if (manager === "pnpm") buildCommand = "pnpm run build";
  else if (manager === "yarn") buildCommand = "yarn run build";
  else if (manager === "bun") buildCommand = "bun run build";

  let installCommand = "npm install";
  if (manager === "pnpm") installCommand = "pnpm install";
  else if (manager === "yarn") installCommand = "yarn install";
  else if (manager === "bun") installCommand = "bun install";

  let lintCommand: string | null = null;
  if (input.scripts?.lint) {
    if (manager === "pnpm") lintCommand = "pnpm run lint";
    else if (manager === "yarn") lintCommand = "yarn run lint";
    else lintCommand = "npm run lint";
  }

  return {
    repoKind,
    packageManager: manager,
    packageManagerVersion: pm.version,
    hasTurbo,
    hasPnpmWorkspace,
    buildCommand,
    installCommand,
    lintCommand,
  };
}

export function isAllowedProjectCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed || trimmed.length > 120) return false;
  if (/[;&|`$<>]/.test(trimmed)) return false;

  const allowed: RegExp[] = [
    /^npm run build$/,
    /^npm run lint$/,
    /^npm run dev$/,
    /^npm install$/,
    /^npm test$/,
    /^pnpm run build$/,
    /^pnpm run lint$/,
    /^pnpm install$/,
    /^yarn run build$/,
    /^yarn run lint$/,
    /^yarn install$/,
    /^npx tsc --noEmit$/,
    /^git status$/,
    /^git log -1$/,
    /^git diff --stat$/,
    /^git branch$/,
  ];
  return allowed.some((p) => p.test(trimmed));
}
