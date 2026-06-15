import type { ProjectBrief } from "@/lib/project-scan/brief";
import type {
  BotDefinition,
  BotTypeId,
  GapFixMission,
  GapFixStep,
  MissionControlState,
  Project,
} from "@/lib/types";
import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { jeffOsDocsAbsolutePath, standardDocsReadBlock } from "@/lib/jeff-os/branding";
import { uid } from "@/lib/utils";

export interface ProjectGap {
  id: string;
  title: string;
  category: "not-built" | "needs-build" | "still-need" | "connection" | "missing" | "hardening";
  detail: string;
}

function resolveBotId(bots: BotDefinition[], type: BotTypeId): string {
  return bots.find((b) => b.type === type)?.id ?? "bot-builder";
}

function resolveBotName(bots: BotDefinition[], type: BotTypeId): string {
  return bots.find((b) => b.type === type)?.name ?? type;
}

function stepBase(partial: Omit<GapFixStep, "id" | "included" | "status">): GapFixStep {
  return { ...partial, id: uid("gfs"), status: "planned", included: true };
}

/** Pull gap list from live snapshot (disk + verify) — not stale seed backlog */
export function collectGaps(brief: ProjectBrief, project: Project): ProjectGap[] {
  if (brief.liveGaps?.length) {
    return brief.liveGaps.map((g) => ({
      id: g.id,
      title: g.title,
      category: (g.category as ProjectGap["category"]) || "still-need",
      detail: `${g.detail} (${g.source})`,
    }));
  }

  const seen = new Set<string>();
  const gaps: ProjectGap[] = [];

  const add = (title: string, category: ProjectGap["category"], detail: string) => {
    const key = title.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    gaps.push({ id: uid("gap"), title, category, detail });
  };

  for (const item of brief.notBuilt) add(item, "not-built", "Not built or not detected on disk");
  for (const item of brief.needsBuild) add(item, "needs-build", "Queued — needs implementation");
  for (const item of brief.stillNeed) add(item, "still-need", "Still needed before ship-ready");
  for (const item of project.ops.missingPieces) add(item, "missing", "Logged missing piece");
  for (const item of project.ops.hardeningSteps) add(item, "hardening", "Hardening step");
  for (const c of brief.connected.filter((x) => !x.ok)) {
    add(`Connect ${c.name}`, "connection", c.detail);
  }

  return gaps.slice(0, 20);
}

export function countGaps(brief: ProjectBrief, project: Project): number {
  if (typeof brief.liveGapCount === "number") return brief.liveGapCount;
  return collectGaps(brief, project).length;
}

function stepsForGap(gap: ProjectGap, bots: BotDefinition[]): GapFixStep[] {
  const base = { gapId: gap.id, gapTitle: gap.title, gapCategory: gap.category };

  return [
    stepBase({
      ...base,
      botType: "architect-bot",
      botId: resolveBotId(bots, "architect-bot"),
      botName: resolveBotName(bots, "architect-bot"),
      phase: "plan",
      summary: `Plan smallest build: ${gap.title}`,
      detail: gap.detail,
    }),
    stepBase({
      ...base,
      botType: "builder-bot",
      botId: resolveBotId(bots, "builder-bot"),
      botName: resolveBotName(bots, "builder-bot"),
      phase: "build",
      summary: `Build/implement: ${gap.title}`,
      detail: `Close gap in repo. Category: ${gap.category}. ${gap.detail}`,
    }),
    stepBase({
      ...base,
      botType: "test-bot",
      botId: resolveBotId(bots, "test-bot"),
      botName: resolveBotName(bots, "test-bot"),
      phase: "test",
      summary: `Verify gap closed: ${gap.title}`,
      detail: "Run build/tests. Report pass/fail.",
    }),
  ];
}

export function generateGapFixPlan(
  brief: ProjectBrief,
  project: Project,
  bots: BotDefinition[],
): GapFixMission {
  const gaps = collectGaps(brief, project);
  const steps: GapFixStep[] = [];
  for (const gap of gaps) {
    steps.push(...stepsForGap(gap, bots));
  }
  return {
    id: uid("gfm"),
    status: steps.length > 0 ? "planned" : "idle",
    steps,
  };
}

export function selectedGapSteps(mission: GapFixMission): GapFixStep[] {
  return mission.steps.filter((s) => s.included !== false);
}

export function toggleGapStepIncluded(mission: GapFixMission, stepId: string): GapFixMission {
  return {
    ...mission,
    steps: mission.steps.map((s) =>
      s.id === stepId ? { ...s, included: s.included === false ? true : false } : s,
    ),
  };
}

export function toggleGapIncluded(mission: GapFixMission, gapId: string): GapFixMission {
  const group = mission.steps.filter((s) => s.gapId === gapId);
  const allOn = group.every((s) => s.included !== false);
  return {
    ...mission,
    steps: mission.steps.map((s) =>
      s.gapId === gapId ? { ...s, included: !allOn } : s,
    ),
  };
}

export function groupStepsByGap(steps: GapFixStep[]) {
  const map = new Map<string, { gapId: string; title: string; category: string; steps: GapFixStep[] }>();
  for (const s of steps) {
    if (!map.has(s.gapId)) {
      map.set(s.gapId, { gapId: s.gapId, title: s.gapTitle, category: s.gapCategory, steps: [] });
    }
    map.get(s.gapId)!.steps.push(s);
  }
  return [...map.values()];
}

function phaseLabel(phase: GapFixStep["phase"]): string {
  if (phase === "plan") return "Plan";
  if (phase === "build") return "Builder";
  if (phase === "test") return "Test";
  return phase;
}

const WORKER_RULES = `Rules:
- Minimal diff. Match repo conventions.
- Run build/test if project has them.
- After each step reply: STEP N DONE — one line summary
- Mode: caveman — short, direct. No essay.`;

export function buildGapFixBundle(
  project: Project,
  mission: GapFixMission,
  state: MissionControlState,
): string {
  const steps = selectedGapSteps(mission);
  if (steps.length === 0) return "";

  const godBotRel = resolveGodBotRelativePath(project);
  const godBotPath = `${jeffOsDocsAbsolutePath()}\\${godBotRel.replace(/\//g, "\\")}`;
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";
  const gapTitles = [...new Set(steps.map((s) => s.gapTitle))];

  const orchestratorPlan = steps
    .map((s, i) => `${i + 1}. ${s.botName} (${phaseLabel(s.phase)}) → ${s.gapTitle}: ${s.summary}`)
    .join("\n");

  const boot = `# GAP MISSION — ${project.name}
Jeff selected ${gapTitles.length} gap(s), ${steps.length} bot step(s). Close gaps — move toward ship-ready.

═══════════════════════════════════════
CONTROL TOWER — MASTER ORCHESTRATOR
═══════════════════════════════════════
Read first:
${standardDocsReadBlock(godBotRel)}
4. Repo README.md + AGENTS.md if exist

Project path: ${project.path ?? "CONFIRM WITH JEFF"}
Voice: ${caveman ? "CAVEman — short, direct, no fluff" : "normal"}
Jeff mode: ${project.jeffMode}

You are the orchestrator. Run these bot steps IN ORDER. Do not skip.
Each step = one bot persona. Complete step → report STEP N DONE → next step.

Orchestration plan (Jeff checked these):
${orchestratorPlan}

═══════════════════════════════════════
GOD BOT BOOT
═══════════════════════════════════════
Load ${godBotPath}
Jeff wants: close selected gaps below. Build missing pieces. Do not break working parts.

Gaps in this mission:
${gapTitles.map((t) => `- ${t}`).join("\n")}

═══════════════════════════════════════
BOT EXECUTION — do in order
═══════════════════════════════════════
`;

  let stepNum = 0;
  const blocks: string[] = [];

  for (const step of steps) {
    stepNum += 1;
    const bot = state.bots.find((b) => b.id === step.botId);
    blocks.push(`### STEP ${stepNum} — ${step.botName} (${phaseLabel(step.phase)} Bot)
Orchestrator assigns: ${step.botName}
Gap: ${step.gapTitle} (${step.gapCategory})
Task: ${step.summary}
Detail: ${step.detail}
${bot?.role ? `Role: ${bot.role}` : ""}
Repo: ${project.path ?? "CONFIRM PATH"}

${WORKER_RULES}

Execute STEP ${stepNum} now. When done reply exactly:
STEP ${stepNum} DONE — [one line what you built]
`);
  }

  const footer = `
═══════════════════════════════════════
MISSION COMPLETE
═══════════════════════════════════════
When ALL ${stepNum} steps done, reply:
GAP MISSION COMPLETE — gaps closed, build passes, Jeff can rescan in Jeff OS.

Jeff marks progress in Jeff OS Easy Mode → Rescan snapshot.
`;

  return boot + blocks.join("\n") + footer;
}
