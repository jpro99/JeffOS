import fs from "fs";
import path from "path";

export interface FolderScan {
  exists: boolean;
  path: string;
  scannedAt: string;
  hasPackageJson: boolean;
  hasReadme: boolean;
  hasAgents: boolean;
  hasEnvExample: boolean;
  hasGit: boolean;
  hasTests: boolean;
  hasSrc: boolean;
  hasAppRouter: boolean;
  hasBuildOutput: boolean;
  packageName?: string;
  scripts: string[];
  readmeLead: string;
  agentsLead: string;
  topLevel: string[];
  signals: string[];
  /** Env vars referenced in .env.example (not secret values) */
  envKeys: string[];
  envServices: string[];
  /** Services with non-empty values in local .env files */
  envConfiguredServices: string[];
  /** Key names that have real local values (never values) */
  envConfiguredKeyNames: string[];
  /** package.json deps indicate integration in code */
  codeIntegrations: string[];
  vercelLinked: boolean;
  vercelProjectId?: string;
  deploySignals: string[];
}

function readHead(filePath: string, max = 600): string {
  try {
    return fs.readFileSync(filePath, "utf8").slice(0, max).trim();
  } catch {
    return "";
  }
}

function hasDir(dirPath: string, name: string): boolean {
  try {
    return fs.existsSync(path.join(dirPath, name)) && fs.statSync(path.join(dirPath, name)).isDirectory();
  } catch {
    return false;
  }
}

/** CI may live in app folder or monorepo root (Project Command). */
function hasCiWorkflow(folderPath: string): boolean {
  if (hasDir(folderPath, ".github")) return true;
  const parent = path.dirname(folderPath);
  if (path.basename(parent).toLowerCase() === "project command") {
    return hasDir(parent, ".github");
  }
  return false;
}

function hasFile(dirPath: string, name: string): boolean {
  try {
    return fs.existsSync(path.join(dirPath, name)) && fs.statSync(path.join(dirPath, name)).isFile();
  } catch {
    return false;
  }
}

const ENV_SERVICE_PATTERNS: { id: string; label: string; patterns: RegExp[] }[] = [
  { id: "duffel", label: "Flights (Duffel)", patterns: [/DUFFEL/i] },
  { id: "maptiler", label: "Maps (MapTiler)", patterns: [/MAPTILER/i, /MAP_TILER/i] },
  { id: "stripe", label: "Payments (Stripe)", patterns: [/STRIPE/i] },
  { id: "clerk", label: "Auth (Clerk)", patterns: [/CLERK/i] },
  { id: "supabase", label: "Database (Supabase)", patterns: [/SUPABASE/i] },
  { id: "openai", label: "AI (OpenAI)", patterns: [/OPENAI/i] },
  { id: "anthropic", label: "AI (Anthropic)", patterns: [/ANTHROPIC/i] },
  { id: "gemini", label: "AI (Gemini)", patterns: [/GEMINI/i, /GOOGLE_AI/i] },
  { id: "resend", label: "Email (Resend)", patterns: [/RESEND/i] },
  { id: "upstash", label: "Redis (Upstash)", patterns: [/UPSTASH/i] },
  { id: "sentry", label: "Monitoring (Sentry)", patterns: [/SENTRY/i] },
  { id: "inngest", label: "Jobs (Inngest)", patterns: [/INNGEST/i] },
  { id: "vercel", label: "Hosting (Vercel)", patterns: [/VERCEL/i] },
];

function scanEnvExample(folderPath: string): { envKeys: string[]; envServices: string[] } {
  const envKeys: string[] = [];
  const envServices: string[] = [];
  const candidates = [".env.example", ".env.local.example", ".env.sample"];
  const envPath = candidates.map((f) => path.join(folderPath, f)).find((p) => fs.existsSync(p));
  if (!envPath) return { envKeys, envServices };

  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const key = trimmed.split("=")[0]?.trim();
      if (key) envKeys.push(key);
    }
    for (const svc of ENV_SERVICE_PATTERNS) {
      if (svc.patterns.some((p) => envKeys.some((k) => p.test(k)))) {
        envServices.push(svc.id);
      }
    }
  } catch {
    /* ignore */
  }
  return { envKeys, envServices };
}

const PLACEHOLDER_VALUES = /^(?:x+|your_|changeme|replace|todo|fixme|xxx|\*\*\*|placeholder|insert)/i;

function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    /* ignore */
  }
  return out;
}

function isRealEnvValue(value: string): boolean {
  if (!value || value.length < 4) return false;
  if (PLACEHOLDER_VALUES.test(value)) return false;
  return true;
}

/** Read local .env* — never returns secret values, only key names with real values */
function scanLocalEnvFiles(folderPath: string): {
  envConfiguredServices: string[];
  envConfiguredKeyNames: string[];
} {
  const envConfiguredKeyNames: string[] = [];
  const merged: Record<string, string> = {};

  const files = [".env", ".env.local", ".env.development", ".env.development.local"];
  for (const f of files) {
    const p = path.join(folderPath, f);
    if (!fs.existsSync(p)) continue;
    Object.assign(merged, parseEnvFile(p));
  }

  for (const [key, val] of Object.entries(merged)) {
    if (isRealEnvValue(val)) envConfiguredKeyNames.push(key);
  }

  const envConfiguredServices: string[] = [];
  for (const svc of ENV_SERVICE_PATTERNS) {
    if (svc.patterns.some((p) => envConfiguredKeyNames.some((k) => p.test(k)))) {
      envConfiguredServices.push(svc.id);
    }
  }

  return { envConfiguredServices, envConfiguredKeyNames };
}

const PACKAGE_INTEGRATION_DEPS: { id: string; patterns: RegExp[] }[] = [
  { id: "clerk", patterns: [/^@clerk\//] },
  { id: "duffel", patterns: [/duffel/i] },
  { id: "stripe", patterns: [/^@stripe\//, /^stripe$/] },
  { id: "maptiler", patterns: [/maptiler/i, /maplibre/i] },
  { id: "supabase", patterns: [/^@supabase\//] },
  { id: "openai", patterns: [/^openai$/] },
  { id: "anthropic", patterns: [/^@anthropic-ai\//] },
  { id: "sentry", patterns: [/^@sentry\//] },
  { id: "inngest", patterns: [/^inngest$/] },
  { id: "upstash", patterns: [/^@upstash\//] },
  { id: "resend", patterns: [/^resend$/] },
  { id: "vercel", patterns: [/^@vercel\//] },
];

function scanPackageIntegrations(folderPath: string): string[] {
  const pkgPath = path.join(folderPath, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const found: string[] = [];
    for (const int of PACKAGE_INTEGRATION_DEPS) {
      if (Object.keys(deps).some((d) => int.patterns.some((p) => p.test(d)))) {
        found.push(int.id);
      }
    }
    return found;
  } catch {
    return [];
  }
}

function scanVercelLink(folderPath: string): { vercelLinked: boolean; vercelProjectId?: string } {
  const vercelJson = path.join(folderPath, ".vercel", "project.json");
  if (!fs.existsSync(vercelJson)) {
    return { vercelLinked: fs.existsSync(path.join(folderPath, "vercel.json")) };
  }
  try {
    const data = JSON.parse(fs.readFileSync(vercelJson, "utf8")) as { projectId?: string };
    return { vercelLinked: true, vercelProjectId: data.projectId };
  } catch {
    return { vercelLinked: true };
  }
}

/** Shallow folder read — safe for local dev scan. */
export function scanProjectFolder(folderPath: string): FolderScan {
  const scannedAt = new Date().toISOString();
  const empty: FolderScan = {
    exists: false,
    path: folderPath,
    scannedAt,
    hasPackageJson: false,
    hasReadme: false,
    hasAgents: false,
    hasEnvExample: false,
    hasGit: false,
    hasTests: false,
    hasSrc: false,
    hasAppRouter: false,
    hasBuildOutput: false,
    scripts: [],
    readmeLead: "",
    agentsLead: "",
    topLevel: [],
    signals: ["Folder not found on disk"],
    envKeys: [],
    envServices: [],
    envConfiguredServices: [],
    envConfiguredKeyNames: [],
    codeIntegrations: [],
    vercelLinked: false,
    deploySignals: [],
  };

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return { ...empty, exists: true, signals: ["Could not read folder"] };
  }

  const scan: FolderScan = {
    exists: true,
    path: folderPath,
    scannedAt,
    hasPackageJson: hasFile(folderPath, "package.json"),
    hasReadme: hasFile(folderPath, "README.md"),
    hasAgents: hasFile(folderPath, "AGENTS.md"),
    hasEnvExample: hasFile(folderPath, ".env.example") || hasFile(folderPath, ".env.local.example"),
    hasGit: hasDir(folderPath, ".git"),
    hasTests: hasDir(folderPath, "tests") || hasDir(folderPath, "__tests__") || hasDir(folderPath, "e2e"),
    hasSrc: hasDir(folderPath, "src"),
    hasAppRouter: hasDir(folderPath, path.join("src", "app")) || hasDir(folderPath, "app"),
    hasBuildOutput: hasDir(folderPath, ".next") || hasDir(folderPath, "dist") || hasDir(folderPath, "out"),
    scripts: [],
    readmeLead: readHead(path.join(folderPath, "README.md")),
    agentsLead: readHead(path.join(folderPath, "AGENTS.md"), 400),
    topLevel: entries.filter((e) => !e.startsWith(".")).slice(0, 20),
    signals: [],
    envKeys: [],
    envServices: [],
    envConfiguredServices: [],
    envConfiguredKeyNames: [],
    codeIntegrations: [],
    vercelLinked: false,
    deploySignals: [],
  };

  const envScan = scanEnvExample(folderPath);
  scan.envKeys = envScan.envKeys;
  scan.envServices = envScan.envServices;

  const localEnv = scanLocalEnvFiles(folderPath);
  scan.envConfiguredServices = localEnv.envConfiguredServices;
  scan.envConfiguredKeyNames = localEnv.envConfiguredKeyNames;

  scan.codeIntegrations = scanPackageIntegrations(folderPath);
  const vercel = scanVercelLink(folderPath);
  scan.vercelLinked = vercel.vercelLinked;
  scan.vercelProjectId = vercel.vercelProjectId;
  if (vercel.vercelLinked) scan.deploySignals.push("Vercel project linked");
  if (scan.codeIntegrations.length > 0) {
    scan.deploySignals.push(`Code uses: ${scan.codeIntegrations.join(", ")}`);
  }
  if (scan.envConfiguredServices.length > 0) {
    scan.deploySignals.push(`Local keys: ${scan.envConfiguredServices.join(", ")}`);
  }

  if (scan.hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(folderPath, "package.json"), "utf8")) as {
        name?: string;
        scripts?: Record<string, string>;
      };
      scan.packageName = pkg.name;
      scan.scripts = Object.keys(pkg.scripts ?? {}).slice(0, 12);
      if (pkg.scripts?.build) scan.signals.push("Has build script");
      if (pkg.scripts?.test || pkg.scripts?.["test:e2e"]) scan.signals.push("Has test scripts");
      if (pkg.scripts?.dev) scan.signals.push("Has dev script");
    } catch {
      scan.signals.push("package.json unreadable");
    }
  } else if (entries.some((e) => e.endsWith(".sln"))) {
    scan.signals.push(".NET solution on disk");
  }

  if (scan.hasReadme) scan.signals.push("README present");
  if (scan.hasAgents) scan.signals.push("AGENTS rules file");
  if (scan.hasGit) scan.signals.push("Git repo");
  if (hasCiWorkflow(folderPath)) scan.signals.push("GitHub CI workflows");
  if (hasFile(folderPath, "vercel.json")) scan.signals.push("Vercel config present");
  if (hasFile(folderPath, path.join("src", "components", "easy", "EasySelfBuildBanner.tsx"))) {
    scan.signals.push("Self-build UX banner");
  }
  if (scan.hasAppRouter) scan.signals.push("App router / src layout");
  if (scan.hasBuildOutput) scan.signals.push("Prior build output (.next/dist)");
  if (scan.hasEnvExample && scan.envServices.length > 0) {
    scan.signals.push(`Env expects: ${scan.envServices.join(", ")}`);
  } else if (scan.hasEnvExample) {
    scan.signals.push(".env.example present");
  }
  if (!scan.hasPackageJson && !entries.some((e) => e.endsWith(".sln"))) {
    scan.signals.push("No package.json — may be empty or non-Node");
  }

  return scan;
}

export function parseGodBotSections(content: string): {
  purpose: string;
  goals: string[];
  gotchas: string[];
} {
  const purpose =
    content.match(/\|\s*Purpose\s*\|\s*(.+?)\s*\|/i)?.[1]?.trim() ||
    content.match(/Purpose[:\s]+(.+)/i)?.[1]?.trim() ||
    "";

  const goals: string[] = [];
  const goalsBlock = content.match(/## Goals[\s\S]*?(?=\n## |$)/i)?.[0];
  if (goalsBlock) {
    for (const line of goalsBlock.split("\n")) {
      const m = line.match(/^[-*]\s+(.+)/);
      if (m) goals.push(m[1].trim());
    }
  }

  const gotchas: string[] = [];
  const gotchaBlock = content.match(/## Gotchas[\s\S]*?(?=\n## |$)/i)?.[0];
  if (gotchaBlock) {
    for (const line of gotchaBlock.split("\n")) {
      const m = line.match(/^[-*]\s+(.+)/);
      if (m && !m[1].includes("[TODO]")) gotchas.push(m[1].trim());
    }
  }

  return { purpose, goals, gotchas };
}
