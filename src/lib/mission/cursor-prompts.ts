import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import type { PasteAnalysis } from "@/lib/mission/paste-fix";
import { summarizeIntent } from "@/lib/mission/intent";
import { DEFAULT_REPO_PROFILE } from "@/lib/project-scan/repo-profile";
import type { BotDefinition, BotTypeId, InterfaceId, MissionControlState, Project } from "@/lib/types";

const MAX_LOG_CHARS = 6000;

function repoPath(project: Project): string {
  return project.path?.trim() || suggestProjectFolder(project);
}

function buildCommand(project: Project): string {
  return project.ops.repoProfile?.buildCommand ?? DEFAULT_REPO_PROFILE.buildCommand;
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

function addStepsForIntent(intent: string, verify: string): AddStep[] {
  const t = intent.trim();
  const isFix = /\b(fix|bug|error|broken|crash|repair|patch)\b/i.test(t);
  const isSmall =
    t.length < 220 ||
    /\b(button|click|copy|paste|panel|label|text|show|hide|display|ui|ux|screen|wording)\b/i.test(t);

  if (isFix && isSmall) {
    return [
      { n: 1, who: "Debug", task: "Find root cause — one line" },
      { n: 2, who: "Builder", task: t },
      { n: 3, who: "Test", task: `Run \`${verify}\` — must pass` },
    ];
  }

  if (isSmall) {
    return [
      { n: 1, who: "Builder", task: t },
      { n: 2, who: "Test", task: `Run \`${verify}\` — must pass` },
    ];
  }

  return [
    { n: 1, who: "Spec", task: "3 bullet acceptance criteria — no essay" },
    { n: 2, who: "Builder", task: t },
    { n: 3, who: "Test", task: `Run \`${verify}\` — must pass` },
  ];
}

/** Add to project — new work, not error repair. Minimal bots only. */
export function buildCompactAddPrompt(
  project: Project,
  intent: string,
  state: MissionControlState,
): { prompt: string; stepCount: number } {
  const trimmed = intent.trim();
  const repo = repoPath(project);
  const verify = buildCommand(project);
  const godBot = resolveGodBotRelativePath(project);
  const steps = addStepsForIntent(trimmed, verify);

  const stepBlock = steps.map((s) => `${s.n}. ${s.who} — ${s.task}`).join("\n");

  const prompt = `# ADD TO PROJECT — ${project.name}
Jeff wants: ${trimmed}

Repo: ${repo}
Read: ${godBot}
Verify: ${verify}
${cavemanLine(state, project)}

Do:
${stepBlock}

Rules: minimal diff. Match repo. Do not repeat this prompt back.
Reply: ADD COMPLETE — one line what changed`;

  return { prompt, stepCount: steps.length };
}

export function addPromptSummary(intent: string): string {
  return summarizeIntent(intent);
}
