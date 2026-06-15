import type { MissionControlState, Project } from "@/lib/types";
import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { standardDocsReadBlock } from "@/lib/jeff-os/branding";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";

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

export interface PasteAnalysis {
  kind: PasteIssueKind;
  headline: string;
  summary: string;
  fileRefs: string[];
  errorLines: string[];
  runCommands: string[];
}

const KIND_LABELS: Record<PasteIssueKind, string> = {
  build: "Build failed",
  typescript: "TypeScript / type error",
  runtime: "Runtime crash",
  git: "Git problem",
  deploy: "Deploy / Vercel",
  route: "Missing route / 404",
  npm: "npm / install",
  lint: "Lint / ESLint",
  unknown: "Needs diagnosis",
};

function lines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trimEnd());
}

function extractFileRefs(text: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /(?:^|\s)([\w./\\-]+\.(?:tsx?|jsx?|mjs|cjs|css|json)):(\d+)(?::(\d+))?/gi,
    /(?:at |in )([\w./\\-]+\.(?:tsx?|jsx?)):(\d+)/gi,
    /([\w./\\-]+\\src\\[\w./\\-]+\.(?:tsx?|jsx?)):(\d+)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      refs.add(`${m[1]}:${m[2]}${m[3] ? `:${m[3]}` : ""}`);
    }
  }
  return [...refs].slice(0, 12);
}

function extractErrorLines(text: string): string[] {
  const out: string[] = [];
  for (const line of lines(text)) {
    const t = line.trim();
    if (!t) continue;
    if (
      /error TS\d+/i.test(t) ||
      /^error:/i.test(t) ||
      /failed to compile/i.test(t) ||
      /Type error:/i.test(t) ||
      /Module not found/i.test(t) ||
      /Cannot find module/i.test(t) ||
      /ENOENT/i.test(t) ||
      /exit code [1-9]/i.test(t) ||
      /✕|✖|⨯/.test(t)
    ) {
      out.push(t.slice(0, 240));
    }
  }
  return out.slice(0, 8);
}

export function classifyPaste(text: string): PasteIssueKind {
  const t = text.toLowerCase();
  if (/git (push|pull|commit|merge|rebase)|not a git|fatal:/.test(t)) return "git";
  if (/vercel|deploy failed|build failed in vercel/.test(t)) return "deploy";
  if (/404|not found.*route|get \/\w+ 404/.test(t)) return "route";
  if (/npm err|eacces|peer dep|npm install|cannot find module 'npm/.test(t)) return "npm";
  if (/eslint|lint error|@typescript-eslint/.test(t)) return "lint";
  if (/error ts\d+|type error|cannot find name|is not assignable/.test(t)) return "typescript";
  if (/unhandled|runtime error|referenceerror|typeerror|chunkloaderror/.test(t)) return "runtime";
  if (/failed to compile|next\.js|turbopack|webpack|build error|npm run build/.test(t)) return "build";
  return "unknown";
}

export function analyzePaste(text: string, project: Project): PasteAnalysis {
  const trimmed = text.trim();
  const kind = classifyPaste(trimmed);
  const fileRefs = extractFileRefs(trimmed);
  const errorLines = extractErrorLines(trimmed);
  const repo = project.path?.trim() || suggestProjectFolder(project);

  const runCommands: string[] = [];
  if (repo) runCommands.push(`cd "${repo}"`);

  switch (kind) {
    case "build":
    case "typescript":
    case "lint":
      runCommands.push("npm run build");
      break;
    case "npm":
      runCommands.push("npm install", "npm run build");
      break;
    case "git":
      runCommands.push("git status", "git log -1 --oneline");
      break;
    case "deploy":
      runCommands.push("npm run build", "git status");
      break;
    case "route":
      runCommands.push("npm run dev");
      break;
    case "runtime":
      runCommands.push("npm run dev");
      break;
    default:
      runCommands.push("npm run build");
  }

  const headline = KIND_LABELS[kind];
  const summary =
    errorLines[0] ??
    (fileRefs[0] ? `Issue near ${fileRefs[0]}` : "Paste looks like a problem — fix prompt will target it.");

  return { kind, headline, summary, fileRefs, errorLines, runCommands };
}

export function buildPasteFixPrompt(
  pasted: string,
  project: Project,
  state: MissionControlState,
  analysis: PasteAnalysis,
): string {
  const godBotRel = resolveGodBotRelativePath(project);
  const repo = project.path?.trim() || suggestProjectFolder(project);
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";

  const fileBlock =
    analysis.fileRefs.length > 0
      ? analysis.fileRefs.map((f) => `- ${f}`).join("\n")
      : "- (parse from paste below)";

  const runBlock = analysis.runCommands.map((c, i) => `${i + 1}. ${c}`).join("\n");

  return `# PASTE FIX — ${project.name}
Jeff pasted output from terminal / browser / build. Fix it. Return real code on disk.

Issue type: ${analysis.headline}
Summary: ${analysis.summary}

═══════════════════════════════════════
CONTROL TOWER — read first
═══════════════════════════════════════
${standardDocsReadBlock(godBotRel)}

Repo: ${repo}
Voice: ${caveman ? "CAVEman — short, direct" : "normal"}

═══════════════════════════════════════
WHAT JEFF PASTED (source of truth)
═══════════════════════════════════════
\`\`\`
${pasted.trim().slice(0, 12000)}
\`\`\`

Likely files:
${fileBlock}

═══════════════════════════════════════
DO IN ORDER
═══════════════════════════════════════

### STEP 1 — Debug Bot
Reproduce from paste. One-line root cause. No guessing.

### STEP 2 — Builder Bot
Fix with **minimal diff**. Match repo conventions. Show exact file changes.

### STEP 3 — Test Bot
Run:
${runBlock}
Must pass before done.

### STEP 4 — Report back to Jeff
Reply with:
1. **What broke** — one line
2. **What you changed** — file list
3. **Commands Jeff can run** — copy-paste ready:
${analysis.runCommands.map((c) => `   ${c}`).join("\n")}
4. **Code snippets** — only if Jeff must paste something manually (prefer you edit files)

Final line exactly:
PASTE FIX DONE — [one line]

Rules:
- Real fixes on disk — no placeholders
- If blocked, say BLOCKED — why
- Do not skip npm run build if project has it
`;
}

export function buildQuickRunBlock(analysis: PasteAnalysis): string {
  return analysis.runCommands.join("\n");
}
