import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import type { PasteAnalysis } from "@/lib/mission/paste-fix";
import { isSingleTaskIntent, isVisionIntent, summarizeIntent } from "@/lib/mission/intent";
import {
  applyCostModeToProfile,
  applyProjectPlaybook,
  formatGodModeBlock,
  formatPlaybookBootBlock,
  playbookExtraRead,
  playbookVerifyOverride,
  type AddIntentProfile,
} from "@/lib/mission/add-prompt-playbooks";
import { formatDesignReferenceBlock, type DesignReference } from "@/lib/mission/design-from-image";
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
  const playbookCmd = playbookVerifyOverride(project);
  if (playbookCmd) return `${playbookCmd} (see God Bot doc)`;
  if (project.ops.repoProfile?.buildCommand) return project.ops.repoProfile.buildCommand;
  const stack = project.stack.join(" ").toLowerCase();
  if (stack.includes(".net") || stack.includes("dotnet")) {
    return "dotnet build (see God Bot doc for solution path)";
  }
  if (stack.includes("flutter")) {
    return "flutter analyze (see God Bot doc)";
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

type AddStep = { n: number; who: string; task: string };

function stripPhase2Suffix(goal: string): string {
  return goal.replace(/\s*\(Phase 2:.*\)$/i, "").trim();
}

function detectAddIntentProfile(cleaned: string, project: Project): AddIntentProfile {
  const t = cleaned.toLowerCase();
  const goal = synthesizeAddGoal(cleaned);
  const verify = verifyLabel(project);

  if (/\bremote|desktop|rdp|vnc|screen share\b/.test(t)) {
    const files = /\bfile|transfer|upload|download\b/.test(t);
    const fleet = /\b8 pc|eight pc|fleet|all pc|promote|multiple computer|8 computer/.test(t);
    return {
      domain: "remote-desktop",
      phase1Goal: stripPhase2Suffix(goal),
      phase2Later: fleet ?
        "Enroll ~8 office PCs, fleet push updates, mass agent promote"
      : "Multi-PC fleet, silent mass deploy, enterprise polish",
      acceptance: [
        "Host PC shows clear on-screen consent banner before guest gets control",
        "Guest connects via invite link + one Connect button (Entra-signed where applicable)",
        files ?
          "Bidirectional file transfer works between two linked PCs in Phase 1"
        : "Host can end session instantly; audit trail in Edgar logs",
        `Reuse existing Edgar agent/web patterns; ${verify} passes`,
      ],
      architectTask:
        "Map to Edgar .NET + Docker + Entra — compare MeshCentral, RustDesk, Tailscale Funnel; reuse before inventing protocol",
      specTask: "Confirm acceptance bullets below — edit if wrong, then lock Phase 1 scope",
      builderHint: "Smallest vertical slice in-repo — wire agent + web UI; no greenfield rewrite",
      outOfScope: ["Full 8-PC fleet", "Silent install", "UAC/AV bypass", "Custom codec from scratch"],
    };
  }

  if (/\b(auth|sign.?in|login|entra|oauth|sso|mfa)\b/.test(t)) {
    return {
      domain: "auth",
      phase1Goal: stripPhase2Suffix(goal),
      phase2Later: isBigAddIntent(cleaned) ? "Advanced roles, SSO edge cases, full audit UI" : null,
      acceptance: [
        "Happy path sign-in works for target user type",
        "Secrets/tokens not logged; follows repo auth patterns",
        "Security review items documented if any remain",
        `${verify} passes`,
      ],
      architectTask: "Follow existing Entra/auth patterns in repo — no new auth library unless required",
      specTask: "3 acceptance bullets — auth Phase 1 only",
      builderHint: "Minimal diff — extend existing auth middleware/pages",
      outOfScope: ["Full RBAC redesign", "Multi-tenant", "V2 admin console"],
    };
  }

  if (/\b(deploy|docker|nas|vercel|ci|pipeline|release)\b/.test(t)) {
    return {
      domain: "deploy",
      phase1Goal: stripPhase2Suffix(goal),
      phase2Later: isBigAddIntent(cleaned) ? "Multi-env, auto-rollback, full monitoring" : null,
      acceptance: [
        "Documented deploy path Jeff can run repeatability",
        "Secrets/env handled per God Bot — not hardcoded",
        "Smoke check after deploy defined",
        `${verify} passes`,
      ],
      architectTask: "Match existing Docker/NAS/Vercel patterns in repo — Deployment Bot mindset",
      specTask: "3 acceptance bullets — deploy Phase 1 only",
      builderHint: "Scripts/docs + minimal config diff — ship runnable path first",
      outOfScope: ["Full observability stack", "Blue-green", "Multi-region"],
    };
  }

  const stackText = project.stack.join(" ").toLowerCase();
  if (
    /\b(flutter|dart|ios app|android app|mobile app)\b/.test(t) ||
    stackText.includes("flutter")
  ) {
    const big = isBigAddIntent(cleaned);
    return {
      domain: "mobile",
      phase1Goal: stripPhase2Suffix(goal),
      phase2Later: big ? "Full product polish, stores, analytics" : null,
      acceptance: [
        "Core loop or screen change matches Goal — one platform path first",
        "Matches existing Flutter folder structure and state patterns",
        `${verify} passes`,
      ],
      architectTask: "Flutter scaffold — Spec clarity before large widget trees",
      specTask: big ? "3 bullets: user action → screen → done (Phase 1)" : "1–3 acceptance bullets",
      builderHint: "One screen or flow — no app-wide refactor",
      outOfScope: big ? ["Both iOS+Android store ship", "Backend rewrite"] : [],
    };
  }

  if (
    /\b(legal|attorney|court|chapter|bankruptcy|matter|hearing|plaintiff|defendant|hipaa)\b/.test(t) ||
    /bankruptcy|demand-generator|legal/.test(project.slug)
  ) {
    const big = isBigAddIntent(cleaned);
    return {
      domain: "legal",
      phase1Goal: stripPhase2Suffix(goal),
      phase2Later: big ? "Multi-jurisdiction, full audit UI" : null,
      acceptance: [
        "No PII/secrets in logs or client bundles",
        "Auth/RLS paths unchanged unless migration documented",
        "Careful mode — Security Worker sign-off on data paths",
        `${verify} passes`,
      ],
      architectTask: "Legal SaaS patterns — RLS, matter scoping, webhook safety",
      specTask: "3 acceptance bullets — legal Phase 1 only",
      builderHint: "Minimal diff — never run production deploy during dev",
      outOfScope: ["Production deploy during dev", "RBAC redesign", "New payment rail"],
    };
  }

  if (isSingleTaskIntent(cleaned) || /\b(ui|ux|button|panel|label|screen|wording|layout)\b/.test(t)) {
    const big = isBigAddIntent(cleaned);
    return {
      domain: "ui",
      phase1Goal: stripPhase2Suffix(goal),
      phase2Later: null,
      acceptance: [
        "Visible UI change matches Jeff wants on desktop width",
        "Matches existing component/style patterns",
        `${verify} passes`,
      ],
      architectTask: "Reuse existing components — no new design system",
      specTask: "1–3 acceptance bullets — what user sees/clicks",
      builderHint: "Smallest UI diff; no drive-by refactors",
      outOfScope: big ? ["Full redesign", "Mobile rewrite unless asked"] : [],
    };
  }

  const big = isBigAddIntent(cleaned);
  return {
    domain: "generic",
    phase1Goal: stripPhase2Suffix(goal),
    phase2Later: big ? "Fleet, v2 features, polish — after Phase 1 ships" : null,
    acceptance: [
      "User-visible outcome matches Goal (Phase 1 only)",
      "Minimal diff — matches repo conventions",
      `${verify} passes`,
    ],
    architectTask: "Fit existing repo + stack — minimal diff, no greenfield rewrite",
    specTask: big ? "3 acceptance bullets — Phase 1 ONLY, caveman" : "3 acceptance bullets — no essay",
    builderHint: "Implement Phase 1 only — no scope creep",
    outOfScope: big ? ["V2", "Full fleet", "Nice-to-have polish"] : [],
  };
}

function formatAcceptanceBlock(acceptance: string[]): string {
  return ["Acceptance (Spec Bot confirms, then build):", ...acceptance.map((a) => `- ${a}`)].join("\n");
}

function formatVoiceContext(cleaned: string, brief: string, profile: AddIntentProfile): string | null {
  if (profile.domain !== "generic") return null;
  if (!isFragmentedVoice(cleaned)) return null;
  const merged = mergeVoiceFragments(cleaned);
  if (!merged || merged === brief || merged.length < 24) return null;
  return `Voice (context only — ignore broken period chunks):\n- ${merged.slice(0, 360)}`;
}

function formatStackLine(project: Project): string {
  if (project.stack.length === 0) return "";
  return `Stack: ${project.stack.slice(0, 6).join(" · ")}`;
}

function formatAddHeader(cleaned: string, brief: string, profile: AddIntentProfile, isBig: boolean): string {
  if (!isBig && profile.domain === "ui" && isSingleTaskIntent(cleaned)) {
    return brief.includes("\n- ") ? `Jeff wants:\n${brief}` : `Jeff wants: ${brief}`;
  }

  const voice = formatVoiceContext(cleaned, profile.phase1Goal, profile);
  const lines = [`Goal (Phase 1): ${profile.phase1Goal}`];
  if (profile.phase2Later) lines.push(`Later (Phase 2 — do NOT build now): ${profile.phase2Later}`);
  lines.push(formatAcceptanceBlock(profile.acceptance));
  if (voice) lines.push(voice);
  return lines.join("\n\n");
}

function formatPhaseBlockFromProfile(profile: AddIntentProfile): string | null {
  if (profile.outOfScope.length === 0 && !profile.phase2Later) return null;
  const oos = profile.outOfScope.length > 0 ? profile.outOfScope.join(", ") : "v2, polish";
  return `Phase 1 ONLY (this session):
- Ship Goal above — acceptance bullets are the contract
Out of scope now: ${oos}`;
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
  const fromPlaybook = playbookExtraRead(project);
  const extras = [...fromPlaybook];
  if (extras.length === 0) {
    const key = `${project.slug} ${project.name}`.toLowerCase();
    if (/edgar/.test(key)) extras.push("START-HERE-EDGAR.md");
    if (/bankruptcy/.test(key)) extras.push("repo README + God Bot");
  }
  const parts = [godBotRel, ...extras];
  return [...new Set(parts)].join(" · ");
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

function formatPhaseBlock(cleaned: string, profile?: AddIntentProfile): string | null {
  if (profile && (profile.outOfScope.length > 0 || profile.phase2Later)) {
    return formatPhaseBlockFromProfile(profile);
  }
  if (!isBigAddIntent(cleaned)) return null;
  const t = cleaned.toLowerCase();
  let mvp = "Smallest shippable slice — acceptance bullets above are the contract";
  if (/\bremote|desktop|rdp|screen share|vnc\b/.test(t)) {
    mvp =
      "Spike one PC: invite → Connect → consent banner; compare MeshCentral/RustDesk/Tailscale before coding";
  }
  if (/\b8 pc|fleet|all pc|push update|every computer\b/.test(t)) {
    mvp = "One PC end-to-end; fleet push + multi-PC is Phase 2";
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
  profile: AddIntentProfile,
): AddStep[] {
  const goal = profile.phase1Goal;
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

  if (isSmall && !careful && !isFix && profile.domain === "ui") {
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

  const steps: AddStep[] = [{ n: 1, who: spec, task: profile.specTask }];
  let n = 2;

  if (isBig || buildMode === "god" || profile.domain !== "ui") {
    steps.push({ n: n++, who: architect, task: profile.architectTask });
  }

  if (needsSecurityStep(cleaned, buildMode)) {
    steps.push({
      n: n++,
      who: security,
      task: "Signed install + explicit user consent — no UAC/AV bypass, no elevation hacks",
    });
  }

  steps.push({
    n: n++,
    who: builder,
    task: `Implement Phase 1 — ${goal}. ${profile.builderHint}`,
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
  designRef?: DesignReference,
): { prompt: string; stepCount: number } {
  const cleaned = cleanAddIntent(intent);
  const brief = formatIntentBrief(cleaned);
  const isBig = isBigAddIntent(cleaned) || Boolean(designRef);
  const buildMode = resolveBuildMode(project);
  let profile = detectAddIntentProfile(cleaned, project);
  profile = applyProjectPlaybook(profile, project, isBig);
  profile = applyCostModeToProfile(profile, state, buildMode);

  if (designRef) {
    profile = {
      ...profile,
      domain: profile.domain === "generic" ? "ui" : profile.domain,
      acceptance: [
        ...profile.acceptance,
        `UI matches reference screenshot — bg ${designRef.backgroundHex}, accent ${designRef.accentHex}`,
      ],
      builderHint: `${profile.builderHint} — replicate reference colors, spacing, and component style`,
      architectTask: `${profile.architectTask} — design system from Jeff's attached screenshot`,
    };
  }

  const repo = repoPath(project);
  const verify = resolveVerifyCommand(project);
  const godBot = resolveGodBotRelativePath(project);
  const readList = formatReadList(project, godBot);
  const stackLine = formatStackLine(project);
  const steps = addStepsForIntent(project, state, cleaned, brief, buildMode, profile);
  const stepBlock = steps.map((s) => `${s.n}. ${s.who} — ${s.task}`).join("\n");
  const phaseBlock = isBig ? formatPhaseBlock(cleaned, profile) : null;
  const godSeed = formatGodModeBlock(project, buildMode);
  const playbookBoot = formatPlaybookBootBlock(project);
  const header = formatAddHeader(cleaned, brief, profile, isBig);
  const designBlock = designRef ? formatDesignReferenceBlock(designRef) : "";

  const meta = [
    formatAddBotsBlock(project, state, godBot, steps, buildMode),
    stackLine,
    playbookBoot ? `Playbook:\n${playbookBoot}` : "",
    cavemanLine(state, project),
    formatCostLine(state, buildMode),
    godSeed,
  ]
    .filter(Boolean)
    .join("\n");

  const securityRule = needsSecurityStep(cleaned, buildMode)
    ? "Security: no bypass Windows security — proper installer, Entra/consent where applicable."
    : "";

  const qualityLine =
    buildMode === "god" ?
      "Quality: world-class Phase 1 UX on the core path — beat incumbents on consent + simplicity."
    : "Quality: best Phase 1 product — match repo patterns, minimal diff, no prompt repeat.";

  const prompt = `# ADD TO PROJECT — ${project.name}
${header}
${designBlock ? `\n${designBlock}\n` : ""}
Repo: ${repo}
Read: ${readList}
Verify: ${verify}
${meta}
${phaseBlock ? `\n${phaseBlock}\n` : ""}
Do:
${stepBlock}

${qualityLine}
${securityRule}
Rules: Do not repeat this prompt back. No scope creep beyond Phase 1.
Reply: ADD COMPLETE — one line what changed + how to test`;

  return { prompt, stepCount: steps.length };
}

export function addPromptSummary(intent: string): string {
  return summarizeIntent(cleanAddIntent(intent));
}
