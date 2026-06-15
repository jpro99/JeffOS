import { isSuccessfulBuildOutput } from "@/lib/mission/build-output";
import type { RepoProfile } from "@/lib/project-scan/repo-profile";
import { DEFAULT_REPO_PROFILE } from "@/lib/project-scan/repo-profile";

export type PasteIssueKind =
  | "build"
  | "typescript"
  | "runtime"
  | "git"
  | "deploy"
  | "route"
  | "npm"
  | "lint"
  | "unknown";

export type ErrorFixType = "toolchain" | "code" | "config" | "env";

export interface ErrorPatternContext {
  repoPath: string;
  repoProfile?: RepoProfile;
}

export interface MatchedErrorPattern {
  patternId: string;
  title: string;
  rootCause: string;
  fixType: ErrorFixType;
  kind: PasteIssueKind;
  headline: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  fileRefs: string[];
  runCommands: string[];
  cursorHint?: string;
  doNotRewriteAppCode?: boolean;
}

export interface ParsedBuildIssue {
  id: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  source: "build" | "lint" | "typecheck" | "scan";
  patternId?: string;
  fixType?: ErrorFixType;
}

function uniqueCommands(commands: string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((c) => {
    const key = c.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cdCommand(repoPath: string): string | null {
  return repoPath ? `cd "${repoPath}"` : null;
}

function toolchainCommands(ctx: ErrorPatternContext): string[] {
  const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
  const pm = profile.packageManager;
  const version = profile.packageManagerVersion ?? "latest";
  const base = [cdCommand(ctx.repoPath)].filter(Boolean) as string[];

  if (pm === "pnpm" || profile.hasTurbo || profile.hasPnpmWorkspace) {
    return uniqueCommands([
      ...base,
      "corepack enable",
      `corepack prepare pnpm@${version} --activate`,
      "pnpm install",
      profile.buildCommand,
    ]);
  }

  return uniqueCommands([...base, profile.installCommand, profile.buildCommand]);
}

function detectedPmFromLog(text: string, ctx: ErrorPatternContext): "pnpm" | "yarn" | "npm" {
  if (/'pnpm' is not recognized|pnpm: command not found|pnpm not found/i.test(text)) return "pnpm";
  if (/'yarn' is not recognized|yarn: command not found|yarn not found/i.test(text)) return "yarn";
  if (/'npm' is not recognized|npm: command not found|npm not found/i.test(text)) return "npm";
  const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
  if (profile.packageManager === "pnpm" || profile.hasPnpmWorkspace) return "pnpm";
  if (profile.packageManager === "yarn") return "yarn";
  return "npm";
}

const PATTERNS: {
  id: string;
  test: (text: string) => boolean;
  match: (text: string, ctx: ErrorPatternContext) => MatchedErrorPattern;
}[] = [
  {
    id: "package-manager-not-on-path",
    test: (t) =>
      /'(?:pnpm|npm|yarn)' is not recognized|(?:pnpm|npm|yarn): command not found|(?:pnpm|npm|yarn) not found/i.test(
        t,
      ),
    match: (text, ctx) => {
      const pm = detectedPmFromLog(text, ctx);
      const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
      const pmLabel = pm === "pnpm" ? "pnpm" : pm === "yarn" ? "yarn" : "npm";
      return {
        patternId: "package-manager-not-on-path",
        title: `${pmLabel} not on PATH`,
        rootCause: `Windows cannot run ${pmLabel} — enable Corepack or install ${pmLabel} before build.`,
        fixType: "toolchain",
        kind: "npm",
        headline: `${pmLabel} not installed or not on PATH`,
        summary: `'${pmLabel}' is not recognized — toolchain setup only, not app code.`,
        severity: "critical",
        fileRefs: ["package.json (root — check packageManager field)"],
        runCommands: toolchainCommands(ctx),
        cursorHint: `Enable Corepack, ${profile.installCommand}, then ${profile.buildCommand}. Do not refactor app code.`,
        doNotRewriteAppCode: true,
      };
    },
  },
  {
    id: "turbo-package-manager-missing",
    test: (t) => /unable to find package manager binary|cannot find binary path/i.test(t),
    match: (_text, ctx) => ({
      patternId: "turbo-package-manager-missing",
      title: "Turbo — package manager not on PATH",
      rootCause: "Turbo cannot find pnpm/npm/yarn binary. Toolchain setup — not app code.",
      fixType: "toolchain",
      kind: "npm",
      headline: "Turbo monorepo — package manager not found",
      summary:
        "Turbo cannot find the package manager binary (usually pnpm). Enable Corepack, install deps, then rebuild.",
      severity: "critical",
      fileRefs: ["package.json (root — check packageManager field)"],
      runCommands: toolchainCommands(ctx),
      cursorHint:
        "Fix toolchain only — corepack enable, pnpm install, pnpm run build. Do NOT rewrite app logic.",
      doNotRewriteAppCode: true,
    }),
  },
  {
    id: "typescript-error",
    test: (t) => /error TS\d+|type error:/i.test(t),
    match: (text, ctx) => {
      const line = text.match(/error TS\d+:.+|type error:.+/i)?.[0]?.slice(0, 200);
      const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
      return {
        patternId: "typescript-error",
        title: line ?? "TypeScript error",
        rootCause: "Type error in source — fix the named file(s).",
        fixType: "code",
        kind: "typescript",
        headline: "TypeScript / type error",
        summary: line ?? "TypeScript compilation failed.",
        severity: "high",
        fileRefs: extractFileRefs(text),
        runCommands: uniqueCommands([
          cdCommand(ctx.repoPath),
          profile.buildCommand,
        ].filter(Boolean) as string[]),
      };
    },
  },
  {
    id: "module-not-found",
    test: (t) => /module not found|cannot find module/i.test(t),
    match: (text, ctx) => {
      const line = text.match(/module not found:.+|cannot find module.+/i)?.[0]?.slice(0, 200);
      const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
      return {
        patternId: "module-not-found",
        title: line ?? "Module not found",
        rootCause: "Missing import, wrong path, or dependency not installed.",
        fixType: "code",
        kind: "build",
        headline: "Build failed — module not found",
        summary: line ?? "A module import failed during build.",
        severity: "high",
        fileRefs: extractFileRefs(text),
        runCommands: uniqueCommands([
          cdCommand(ctx.repoPath),
          profile.installCommand,
          profile.buildCommand,
        ].filter(Boolean) as string[]),
      };
    },
  },
  {
    id: "failed-to-compile",
    test: (t) => /failed to compile/i.test(t),
    match: (text, ctx) => {
      const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
      return {
        patternId: "failed-to-compile",
        title: "Failed to compile",
        rootCause: "Next/webpack/Turbopack compile error — see file in log.",
        fixType: "code",
        kind: "build",
        headline: "Build failed",
        summary: extractErrorLines(text)[0] ?? "Failed to compile.",
        severity: "critical",
        fileRefs: extractFileRefs(text),
        runCommands: uniqueCommands([
          cdCommand(ctx.repoPath),
          profile.buildCommand,
        ].filter(Boolean) as string[]),
      };
    },
  },
  {
    id: "eslint-error",
    test: (t) => /eslint|@typescript-eslint/i.test(t) && /error/i.test(t),
    match: (text, ctx) => {
      const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
      const lint = profile.lintCommand ?? "npm run lint";
      return {
        patternId: "eslint-error",
        title: "Lint error",
        rootCause: "ESLint rule violation.",
        fixType: "code",
        kind: "lint",
        headline: "Lint / ESLint",
        summary: extractErrorLines(text)[0] ?? "Lint failed.",
        severity: "medium",
        fileRefs: extractFileRefs(text),
        runCommands: uniqueCommands([cdCommand(ctx.repoPath), lint].filter(Boolean) as string[]),
      };
    },
  },
];

export function extractFileRefs(text: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /(?:^|\s)([\w./\\-]+\.(?:tsx?|jsx?|mjs|cjs|css|json)):(\d+)(?::(\d+))?/gi,
    /(?:at |in )([\w./\\-]+\.(?:tsx?|jsx?)):(\d+)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      refs.add(`${m[1]}:${m[2]}${m[3] ? `:${m[3]}` : ""}`);
    }
  }
  return [...refs].slice(0, 12);
}

export function extractErrorLines(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (
      /error TS\d+/i.test(t) ||
      /^error:/i.test(t) ||
      /failed to compile/i.test(t) ||
      /type error:/i.test(t) ||
      /module not found/i.test(t) ||
      /cannot find module/i.test(t) ||
      /unable to find package manager/i.test(t) ||
      /cannot find binary path/i.test(t) ||
      /'(?:pnpm|npm|yarn)' is not recognized/i.test(t) ||
      /(?:pnpm|npm|yarn): command not found/i.test(t) ||
      /^\s*x\s+/i.test(t) ||
      /^\s*->\s+/i.test(t) ||
      /✕|✖|⨯/.test(t)
    ) {
      out.push(t.slice(0, 240));
    }
  }
  return out.slice(0, 8);
}

/** Best matching pattern for full build log (highest priority first). */
export function matchErrorPattern(text: string, ctx: ErrorPatternContext): MatchedErrorPattern | null {
  const trimmed = text.trim();
  if (!trimmed || isSuccessfulBuildOutput(trimmed)) return null;

  for (const pattern of PATTERNS) {
    if (pattern.test(trimmed)) {
      return pattern.match(trimmed, ctx);
    }
  }
  return null;
}

export function classifyPasteKind(text: string): PasteIssueKind {
  const matched = matchErrorPattern(text, { repoPath: "" });
  if (matched) return matched.kind;

  const t = text.toLowerCase();
  if (/git (push|pull|commit|merge|rebase)|not a git|fatal:/.test(t)) return "git";
  if (/vercel|deploy failed/.test(t)) return "deploy";
  if (/404|not found.*route/.test(t)) return "route";
  if (/npm err|peer dep|corepack|pnpm|yarn install/.test(t)) return "npm";
  if (/unhandled|runtime error|referenceerror/.test(t)) return "runtime";
  if (/failed to compile|turbo run build|npm run build/.test(t)) return "build";
  return "unknown";
}

export function analyzeBuildLog(
  text: string,
  ctx: ErrorPatternContext,
): {
  matched: MatchedErrorPattern | null;
  kind: PasteIssueKind;
  headline: string;
  summary: string;
  fileRefs: string[];
  errorLines: string[];
  runCommands: string[];
} {
  const trimmed = text.trim();
  const profile = ctx.repoProfile ?? DEFAULT_REPO_PROFILE;
  const base = [cdCommand(ctx.repoPath)].filter(Boolean) as string[];

  if (isSuccessfulBuildOutput(trimmed)) {
    return {
      matched: null,
      kind: "unknown",
      headline: "Build passed",
      summary: "Build succeeded. Nothing broken in this log.",
      fileRefs: [],
      errorLines: [],
      runCommands: uniqueCommands([...base, profile.buildCommand]),
    };
  }

  const matched = matchErrorPattern(trimmed, ctx);
  if (matched) {
    return {
      matched,
      kind: matched.kind,
      headline: matched.headline,
      summary: matched.summary,
      fileRefs: matched.fileRefs,
      errorLines: extractErrorLines(trimmed),
      runCommands: matched.runCommands,
    };
  }

  const errorLines = extractErrorLines(trimmed);
  const fileRefs = extractFileRefs(trimmed);
  const kind = classifyPasteKind(trimmed);
  const toolchainLikely =
    kind === "npm" ||
    /not recognized|command not found|corepack|ENOENT.*(?:pnpm|npm|yarn)/i.test(trimmed);

  return {
    matched: null,
    kind,
    headline:
      kind === "unknown"
        ? "Needs diagnosis"
        : kind === "typescript"
          ? "TypeScript / type error"
          : kind === "build"
            ? "Build failed"
            : "Package manager / install",
    summary:
      errorLines[0] ??
      (fileRefs[0] ? `Issue near ${fileRefs[0]}` : "Build failed — see log below."),
    fileRefs,
    errorLines,
    runCommands: toolchainLikely
      ? toolchainCommands(ctx)
      : uniqueCommands([...base, profile.installCommand, profile.buildCommand]),
  };
}

/** Issues for verify.ts — same brain as paste-fix. */
export function parseBuildLogIssues(
  output: string,
  ctx: ErrorPatternContext,
  source: ParsedBuildIssue["source"] = "build",
): ParsedBuildIssue[] {
  const trimmed = output.trim();
  if (!trimmed || isSuccessfulBuildOutput(trimmed)) return [];

  const matched = matchErrorPattern(trimmed, ctx);
  if (matched) {
    return [
      {
        id: matched.patternId,
        title: matched.title,
        detail: matched.summary,
        severity: matched.severity,
        source,
        patternId: matched.patternId,
        fixType: matched.fixType,
      },
    ];
  }

  const issues: ParsedBuildIssue[] = [];
  const seen = new Set<string>();

  for (const line of extractErrorLines(trimmed)) {
    if (seen.has(line)) continue;
    seen.add(line);
    issues.push({
      id: `line-${issues.length}`,
      title: line.slice(0, 140),
      detail: line,
      severity: /critical|failed to compile/i.test(line) ? "critical" : "high",
      source,
    });
  }

  if (issues.length === 0) {
    const tail = trimmed.split("\n").filter((l) => l.trim()).slice(-8).join("\n");
    issues.push({
      id: "build-failed-generic",
      title: "Build failed — see log below",
      detail: tail.slice(0, 500) || trimmed.slice(0, 500),
      severity: "critical",
      source,
    });
  }

  return issues.slice(0, 6);
}

export function cursorHintBlock(matched: MatchedErrorPattern | null): string {
  if (!matched?.cursorHint) return "";
  return `
═══════════════════════════════════════
LIKELY FIX (${matched.patternId})
═══════════════════════════════════════
${matched.cursorHint}
${matched.doNotRewriteAppCode ? "\nDo NOT rewrite application logic for this error.\n" : ""}`;
}
