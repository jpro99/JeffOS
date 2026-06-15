import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import type { PasteAnalysis } from "@/lib/mission/paste-fix";
import { isSingleTaskIntent, isVisionIntent, summarizeIntent } from "@/lib/mission/intent";
import { recommendBuildMode, type BuildMode } from "@/lib/mission/suggest-project-bots";
import { DEFAULT_REPO_PROFILE } from "@/lib/project-scan/repo-profile";
import type { BotDefinition, BotTypeId, InterfaceId, MissionControlState, Project } from "@/lib/types";

const MAX_LOG_CHARS = 6000;

function repoPath(project: Project): string {
  return project.path?.trim() || suggestProjectFolder(project);
}

function buildCommand(project: Project): string {
  return resolveVerifyCommand(project);
}

function resolveVerifyCommand(project: Project): string {
  if (project.ops.repoProfile?.buildCommand) return project.ops.repoProfile.buildCommand;
  const stack = project.stack.join(" ").toLowerCase();
  if (stack.includes(".net") || stack.includes("dotnet")) {
    return "dotnet build (see God Bot doc for solution path)";
  }
  return DEFAULT_REPO_PROFILE.buildCommand;
}

function resolveBuildMode(project: Project): BuildMode {
  return project.orchestration?.botSuggestion?.buildMode ?? recommendBuildMode(project);
}

/** Strip voice filler and repeated "Jeff wants:" prefixes. */
export function cleanAddIntent(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ");
  while (/^jeff wants:\s*/i.test(t)) {
    t = t.replace(/^jeff wants:\s*/i, "");
  }
  return dedupeSentences(t).trim();
}

function dedupeSentences(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return text;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase().replace(/\W+/g, " ").slice(0, 72);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join(" ");
}

function splitIntoSentences(text: string): string[] {
  return dedupeSentences(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Voice often inserts periods mid-thought — short chunks are not real sentences. */
function isFragmentedVoice(text: string): boolean {
  const parts = splitIntoSentences(text);
  if (parts.length < 3) return false;
  const avg = parts.reduce((a, p) => a + p.length, 0) / parts.length;
  const short = parts.filter((p) => p.length < 55).length;
  return avg < 50 || short / parts.length >= 0.55;
}

function mergeVoiceFragments(text: string): string {
  const parts = splitIntoSentences(text).filter((p) => {
    if (p.length < 10) return false;
    if (/\b(also|and|to|a|the|into|about|should)$/i.test(p.trim())) return false;
    return true;
  });
  if (parts.length === 0) return text.trim();
  return parts
    .map((p, i) => (i === 0 ? p : `${p.charAt(0).toLowerCase()}${p.slice(1)}`))
    .join(", ")
    .replace(/,\s*,/g, ",")
    .trim();
}

/** One clear goal line for Builder — especially after voice transcription. */
export function synthesizeAddGoal(cleaned: string): string {
  const t = cleaned.toLowerCase();

  if (/\bremote|desktop|rdp|vnc|screen share\b/.test(t)) {
    const fleet = /\b8 pc|eight pc|fleet|all pc|promote|multiple computer|8 computer/.test(t);
    const files = /\bfile|transfer|upload|download\b/.test(t);
    let goal =
      "Professional remote desktop — connect to one Edgar PC from anywhere with clear host consent";
    if (files) goal += "; bidirectional file transfer between two linked PCs";
    if (fleet) goal += " (Phase 2: enroll ~8 office PCs — not this session)";
    return goal;
  }

  if (isFragmentedVoice(cleaned)) {
    const merged = mergeVoiceFragments(cleaned);
    return merged.length > 40 ? merged : cleaned.slice(0, 280).trim();
  }

  if (cleaned.length > 220) return summarizeIntent(cleaned);
  return cleaned;
}

function verifyLabel(project: Project): string {
  return resolveVerifyCommand(project).replace(/\s*\(.*$/, "").trim();
}

/** Caveman brief for the prompt header — bullets only for real sentences, not voice fragments. */
export function formatIntentBrief(cleaned: string): string {
  if (!cleaned) return "";

  if (isFragmentedVoice(cleaned)) {
    return synthesizeAddGoal(cleaned);
  }

  const sentences = splitIntoSentences(cleaned).filter((s) => s.length > 12);

  if (sentences.length >= 3) {
    const avgLen = sentences.reduce((a, s) => a + s.length, 0) / sentences.length;
    if (avgLen >= 45) {
      return sentences
        .slice(0, 7)
        .map((s) => `- ${s.replace(/[.!?]+\s*$/, "")}`)
        .join("\n");
    }
  }

  if (cleaned.length <= 420) return cleaned;

  if (sentences.length >= 2) {
    const avgLen = sentences.reduce((a, s) => a + s.length, 0) / sentences.length;
    if (avgLen >= 45) {
      return sentences
        .slice(0, 7)
        .map((s) => `- ${s.replace(/[.!?]+\s*$/, "")}`)
        .join("\n");
    }
  }

  return synthesizeAddGoal(cleaned);
}

function formatReadList(project: Project, godBotRel: string): string {
  const extras: string[] = [];
  const key = `${project.slug} ${project.name}`.toLowerCase();
  if (/edgar/.test(key)) extras.push("START-HERE-EDGAR.md");
  if (/bankruptcy/.test(key)) extras.push("repo README + God Bot");
  return extras.length ? `${godBotRel} · ${extras.join(" · ")}` : godBotRel;
}

function formatCostLine(state: MissionControlState, buildMode: BuildMode): string {
  if (state.settings.costSaveMode && buildMode === "standard") {
    return "Cost: cheap-fast where safe — no new deps unless required";
  }
  if (buildMode === "god") {
    return "Cost: best product — Phase 1 only; world-class UX on core path";
  }
  if (buildMode === "careful") {
    return "Cost: careful — security + correctness over speed";
  }
  return "Cost: balanced — minimal diff, best UX for the ask";
}

function formatGodModeSeed(project: Project): string {
  const idea = project.ops.godModeIdeas[0];
  if (!idea?.insight.trim()) return "";
  return `God Mode (after Phase 1 — optional): ${idea.insight.trim().slice(0, 180)}`;
}

function isBigAddIntent(cleaned: string): boolean {
  if (isVisionIntent(cleaned)) return true;
  if (cleaned.length > 320) return true;
  return /\b(remote desktop|rdp|vnc|fleet|8 pc|all pc|platform|agent install|push update|every computer|world|enterprise)\b/i.test(
    cleaned,
  );
}

function needsSecurityStep(cleaned: string, buildMode: BuildMode): boolean {
  if (buildMode === "careful") return true;
  return /\b(remote|agent|install|auth|security|legal|entra|admin|elevated|powershell admin|uac|hipaa|payment)\b/i.test(
    cleaned,
  );
}

function formatPhaseBlock(cleaned: string): string | null {
  if (!isBigAddIntent(cleaned)) return null;
  const t = cleaned.toLowerCase();
  let mvp = "Smallest shippable slice — 3 acceptance bullets, then code";
  if (/\bremote|desktop|rdp|screen share|vnc\b/.test(t)) {
    mvp =
      "Spike one PC: invite → one Connect button → clear on-screen banner; compare MeshCentral/RustDesk/Tailscale before coding";
  }
  if (/\b8 pc|fleet|all pc|push update|every computer\b/.test(t)) {
    mvp = "Phase 1: one PC end-to-end; fleet push + multi-PC is Phase 2";
  }
  return `Phase 1 ONLY (this session):
- ${mvp}
Out of scope now: full fleet, polish, v2 — ship Phase 1 first`;
}

function botName(state: MissionControlState, project: Project, type: BotTypeId, fallback: string): string {
  return botByType(state.bots, type, project.workerBotIds)?.name ?? fallback;
}

function cavemanLine(state: MissionControlState, project: Project): string {
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";
  return caveman ? "Voice: caveman — short, direct. No essays." : "Voice: normal — stay concise.";
}

function trimLog(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_LOG_CHARS) return t;
  return `…(truncated)\n${t.slice(-MAX_LOG_CHARS)}`;
}

function isToolchainFix(analysis?: PasteAnalysis): boolean {
  return Boolean(analysis?.doNotRewriteAppCode || analysis?.fixType === "toolchain");
}

function formatWhatsWrong(analysis: PasteAnalysis | undefined, titles: string[]): string {
  const bullets: string[] = [];

  if (analysis?.rootCause) bullets.push(`- ${analysis.rootCause}`);
  for (const line of analysis?.errorLines?.slice(0, 3) ?? []) {
    const short = line.slice(0, 200);
    if (!bullets.some((b) => b.includes(short.slice(0, 40)))) bullets.push(`- ${short}`);
  }
  for (const file of analysis?.fileRefs?.slice(0, 5) ?? []) {
    bullets.push(`- ${file}`);
  }
  for (const title of titles.slice(0, 3)) {
    if (!bullets.some((b) => b.includes(title.slice(0, 30)))) bullets.push(`- ${title}`);
  }

  if (bullets.length === 0) bullets.push("- See build log below");
  return bullets.join("\n");
}

function interfaceLabel(id: InterfaceId): string {
  const labels: Record<InterfaceId, string> = {
    cursor: "Cursor",
    "claude-code": "Claude Code",
    "regular-claude": "Regular Claude",
    "future-custom": "Custom tool",
  };
  return labels[id] ?? id;
}

function botByType(bots: BotDefinition[], type: BotTypeId, preferredIds: string[]): BotDefinition | undefined {
  for (const id of preferredIds) {
    const hit = bots.find((b) => b.id === id && b.type === type);
    if (hit) return hit;
  }
  return bots.find((b) => b.type === type);
}

/** Short bot lineup from project Settings — not a 24-step orchestration. */
export function formatProjectBotsBlock(
  project: Project,
  state: MissionControlState,
  godBotRel: string,
): string {
  const workerIds =
    project.workerBotIds.length > 0 ?
      project.workerBotIds
    : (project.orchestration?.botSuggestion?.recommendedWorkerBotIds ?? []);

  const god = state.bots.find((b) => b.id === project.assignedGodBotId);
  const debug = botByType(state.bots, "debug-bot", workerIds);
  const builder = botByType(state.bots, "builder-bot", workerIds);
  const test = botByType(state.bots, "test-bot", workerIds);
  const workerNames = workerIds
    .map((id) => state.bots.find((b) => b.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  const buildMode = project.orchestration?.botSuggestion?.buildMode;
  const lines = [
    "Bots (from Jeff OS Settings — use these personas, do not redeploy 24 steps):",
    `- God: ${god?.name ?? project.assignedGodBotId} — read ${godBotRel} first`,
    `- Step 1 Debug → ${debug?.name ?? "Debug Bot"}`,
    `- Step 2 Builder → ${builder?.name ?? "Builder Bot"}`,
    `- Step 3 Test → ${test?.name ?? "Test Bot"}`,
    `- Tool: ${interfaceLabel(project.preferredInterface)} · Model: ${project.preferredModelClass}${buildMode ? ` · Mode: ${buildMode}` : ""}`,
  ];

  if (workerNames.length > 0) {
    lines.push(`- Workers: ${workerNames.join(", ")}`);
  }
  if (project.activeBotStrategy?.trim()) {
    lines.push(`- Strategy: ${project.activeBotStrategy.trim().slice(0, 140)}`);
  }

  return lines.join("\n");
}

function formatDoSteps(verify: string, analysis?: PasteAnalysis): string {
  if (isToolchainFix(analysis)) {
    return `Do (in order):
1. Debug — one-line root cause (toolchain/setup — not app bugs)
2. Builder — fix Corepack/PATH/deps only — do NOT rewrite app code
3. Test — run terminal commands below, then \`${verify}\` must pass`;
  }

  return `Do (in order):
1. Debug — one-line root cause from the log
2. Builder — minimal diff in the files listed
3. Test — run \`${verify}\` — must pass`;
}

function formatRunCommands(commands: string[], analysis?: PasteAnalysis): string {
  if (commands.length === 0) return "";
  const label = isToolchainFix(analysis)
    ? "Run in terminal (in order) — fix setup before build:"
    : "Jeff may run:";
  return `${label}\n${commands.map((c) => `- ${c}`).join("\n")}\n`;
}

/** Fix Errors button — what's broke, fix it. No orchestration theater. */
export function buildCompactFixPrompt(
  project: Project,
  state: MissionControlState,
  opts: {
    analysis?: PasteAnalysis;
    pastedLog?: string;
    issueTitles?: string[];
  },
): string {
  const repo = repoPath(project);
  const verify = buildCommand(project);
  const godBot = resolveGodBotRelativePath(project);
  const analysis = opts.analysis;
  const titles =
    opts.issueTitles ??
    [
      ...project.ops.errors.filter((e) => !e.resolved).map((e) => e.title),
      ...project.ops.blockers,
    ];

  const headline = analysis?.headline ?? titles[0] ?? "Build or runtime failure";
  const summary =
    analysis?.summary && analysis.summary !== headline ?
      analysis.summary
    : titles.length > 1 ?
      titles.slice(0, 3).join("; ")
    : (analysis?.errorLines?.[0] ?? "See build log.");
  const whatsWrong = formatWhatsWrong(analysis, titles);
  const logBlock = opts.pastedLog?.trim() ? trimLog(opts.pastedLog) : "";
  const runCommands = analysis?.runCommands?.length ? analysis.runCommands : [];
  const toolchainNote = isToolchainFix(analysis) ? "Toolchain/setup only — do NOT rewrite app logic." : "";
  const hintLine = analysis?.cursorHint ? `Fix hint: ${analysis.cursorHint}` : "";

  const meta = [
    formatProjectBotsBlock(project, state, godBot),
    cavemanLine(state, project),
    analysis?.fixType ? `Fix type: ${analysis.fixType}` : "",
    toolchainNote,
    hintLine,
  ]
    .filter(Boolean)
    .join("\n");

  return `# FIX ERRORS — ${project.name}
Broken: ${headline}
${summary}

Repo: ${repo}
Read: ${godBot}
Verify: ${verify}
${meta}

What's wrong:
${whatsWrong}

${formatDoSteps(verify, analysis)}

${logBlock ? `Build log:\n\`\`\`\n${logBlock}\n\`\`\`\n` : ""}${formatRunCommands(runCommands, analysis)}Reply: FIX DONE — one line what you fixed`;
}

type AddStep = { n: number; who: string; task: string };

function formatAddBotsBlock(
  project: Project,
  state: MissionControlState,
  godBotRel: string,
  steps: AddStep[],
  buildMode: BuildMode,
): string {
  const god = state.bots.find((b) => b.id === project.assignedGodBotId);
  const workerIds =
    project.workerBotIds.length > 0 ?
      project.workerBotIds
    : (project.orchestration?.botSuggestion?.recommendedWorkerBotIds ?? []);
  const workerNames = workerIds
    .map((id) => state.bots.find((b) => b.id === id)?.name)
    .filter((n): n is string => Boolean(n));

  const lines = [
    "Bots (Jeff OS Settings — act as these personas, follow Do order):",
    `- God: ${god?.name ?? project.assignedGodBotId} — read ${godBotRel} before code`,
    ...steps.map((s) => `- ${s.who} — step ${s.n} below`),
    `- Tool: ${interfaceLabel(project.preferredInterface)} · Model: ${project.preferredModelClass} · Mode: ${buildMode}`,
  ];

  if (workerNames.length > 0) lines.push(`- Workers on project: ${workerNames.join(", ")}`);
  if (project.activeBotStrategy?.trim()) {
    lines.push(`- Strategy: ${project.activeBotStrategy.trim().slice(0, 160)}`);
  }
  return lines.join("\n");
}

function addStepsForIntent(
  project: Project,
  state: MissionControlState,
  cleaned: string,
  intentBrief: string,
  buildMode: BuildMode,
): AddStep[] {
  const goal = synthesizeAddGoal(cleaned);
  const oneLine = intentBrief.replace(/\n- /g, "; ").replace(/\s+/g, " ").trim();
  const isSmall = isSingleTaskIntent(oneLine) || oneLine.length < 200;
  const isBig = isBigAddIntent(cleaned);
  const careful = buildMode === "careful" || buildMode === "god" || isBig;
  const verifyShort = verifyLabel(project);

  const spec = botName(state, project, "spec-bot", "Spec Bot");
  const architect = botName(state, project, "architect-bot", "Architect Bot");
  const security = botName(state, project, "security-risk-bot", "Security Bot");
  const builder = botName(state, project, "builder-bot", "Builder Bot");
  const test = botName(state, project, "test-bot", "Test Bot");
  const debug = botName(state, project, "debug-bot", "Debug Bot");

  const isFix = /\b(fix|bug|error|broken|crash|repair|patch)\b/i.test(oneLine);

  if (isSmall && !careful && !isFix) {
    return [
      { n: 1, who: builder, task: goal },
      { n: 2, who: test, task: `Run \`${verifyShort}\` — must pass` },
    ];
  }

  if (isFix && isSmall) {
    return [
      { n: 1, who: debug, task: "Root cause — one line" },
      { n: 2, who: builder, task: goal },
      { n: 3, who: test, task: `Run \`${verifyShort}\` — must pass` },
    ];
  }

  const steps: AddStep[] = [
    {
      n: 1,
      who: spec,
      task: isBig ?
        "3 acceptance bullets — Phase 1 ONLY, caveman"
      : "3 acceptance bullets — no essay",
    },
  ];
  let n = 2;

  if (isBig || buildMode === "god") {
    steps.push({
      n: n++,
      who: architect,
      task: "Fit existing repo + stack — minimal diff, no greenfield rewrite",
    });
  }

  if (needsSecurityStep(cleaned, buildMode)) {
    steps.push({
      n: n++,
      who: security,
      task: "Signed install + user consent — no UAC/AV bypass, no elevation hacks",
    });
  }

  steps.push({
    n: n++,
    who: builder,
    task: `Implement Phase 1 — ${goal}`,
  });
  steps.push({
    n: n++,
    who: test,
    task: `Run \`${verifyShort}\` — see God Bot doc; must pass`,
  });

  return steps;
}

/** Add to project — new work with Settings bots, cleaned intent, phased scope. */
export function buildCompactAddPrompt(
  project: Project,
  intent: string,
  state: MissionControlState,
): { prompt: string; stepCount: number } {
  const cleaned = cleanAddIntent(intent);
  const brief = formatIntentBrief(cleaned);
  const repo = repoPath(project);
  const verify = resolveVerifyCommand(project);
  const godBot = resolveGodBotRelativePath(project);
  const readList = formatReadList(project, godBot);
  const buildMode = resolveBuildMode(project);
  const steps = addStepsForIntent(project, state, cleaned, brief, buildMode);
  const stepBlock = steps.map((s) => `${s.n}. ${s.who} — ${s.task}`).join("\n");
  const phaseBlock = formatPhaseBlock(cleaned);
  const godSeed = formatGodModeSeed(project);

  const header =
    brief.includes("\n- ") ?
      `Jeff wants:\n${brief}`
    : `Jeff wants: ${brief}`;

  const meta = [
    formatAddBotsBlock(project, state, godBot, steps, buildMode),
    cavemanLine(state, project),
    formatCostLine(state, buildMode),
    godSeed,
  ]
    .filter(Boolean)
    .join("\n");

  const securityRule = needsSecurityStep(cleaned, buildMode)
    ? "Security: no bypass Windows security — proper installer, Entra/consent where applicable."
    : "";

  const prompt = `# ADD TO PROJECT — ${project.name}
${header}

Repo: ${repo}
Read: ${readList}
Verify: ${verify}
${meta}
${phaseBlock ? `\n${phaseBlock}\n` : ""}
Do:
${stepBlock}

Quality: Best product for Phase 1 — match repo patterns. Minimal diff. No prompt repeat.
${securityRule}
Rules: Do not repeat this prompt back. No scope creep beyond Phase 1.
Reply: ADD COMPLETE — one line what changed`;

  return { prompt, stepCount: steps.length };
}

export function addPromptSummary(intent: string): string {
  return summarizeIntent(cleanAddIntent(intent));
}
