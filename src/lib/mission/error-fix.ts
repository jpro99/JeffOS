import type {
  BotDefinition,
  BotTypeId,
  ErrorFixMission,
  ErrorFixStep,
  MissionControlState,
  Project,
  ProjectError,
} from "@/lib/types";
import { resolveGodBotRelativePath } from "@/lib/command-center/paths";
import { uid } from "@/lib/utils";

function resolveBotId(bots: BotDefinition[], type: BotTypeId): string {
  return bots.find((b) => b.type === type)?.id ?? "bot-builder";
}

function resolveBotName(bots: BotDefinition[], type: BotTypeId): string {
  return bots.find((b) => b.type === type)?.name ?? type;
}

function stepBase(
  partial: Omit<ErrorFixStep, "id" | "included" | "status">,
): ErrorFixStep {
  return { ...partial, id: uid("efs"), status: "planned", included: true };
}

function stepsForError(error: ProjectError, bots: BotDefinition[]): ErrorFixStep[] {
  const base = {
    sourceType: "error" as const,
    sourceId: error.id,
    errorTitle: error.title,
  };

  const steps: ErrorFixStep[] = [
    stepBase({
      ...base,
      botType: "debug-bot",
      botId: resolveBotId(bots, "debug-bot"),
      botName: resolveBotName(bots, "debug-bot"),
      phase: "debug",
      summary: `Reproduce: ${error.title}`,
      detail: error.aboutToDo || error.likelyCause,
    }),
    stepBase({
      ...base,
      botType: "builder-bot",
      botId: resolveBotId(bots, "builder-bot"),
      botName: resolveBotName(bots, "builder-bot"),
      phase: "fix",
      summary: error.recommendedFix,
      detail: `Why: ${error.whyDoingIt}. Risk if wrong: ${error.couldGoWrong}`,
    }),
    stepBase({
      ...base,
      botType: "test-bot",
      botId: resolveBotId(bots, "test-bot"),
      botName: resolveBotName(bots, "test-bot"),
      phase: "test",
      summary: `Verify fix — run build + tests for ${error.title}`,
      detail: "Confirm error gone. Report pass/fail.",
    }),
  ];

  if (error.taskType === "security" || error.severity === "critical") {
    steps.push(
      stepBase({
        ...base,
        botType: "security-risk-bot",
        botId: resolveBotId(bots, "security-risk-bot"),
        botName: resolveBotName(bots, "security-risk-bot"),
        phase: "security",
        summary: `Security review after fix: ${error.title}`,
        detail: "Check auth, secrets, upload paths. No regressions.",
      }),
    );
  }

  return steps;
}

function stepsForBlocker(blocker: string, index: number, bots: BotDefinition[]): ErrorFixStep[] {
  const sourceId = `blocker-${index}`;
  const base = { sourceType: "blocker" as const, sourceId, errorTitle: blocker };

  return [
    stepBase({
      ...base,
      botType: "architect-bot",
      botId: resolveBotId(bots, "architect-bot"),
      botName: resolveBotName(bots, "architect-bot"),
      phase: "debug",
      summary: `Analyze blocker: ${blocker}`,
      detail: "Find root cause. Smallest path to unblock.",
    }),
    stepBase({
      ...base,
      botType: "builder-bot",
      botId: resolveBotId(bots, "builder-bot"),
      botName: resolveBotName(bots, "builder-bot"),
      phase: "fix",
      summary: `Clear blocker: ${blocker}`,
      detail: "Minimal diff. Match repo conventions.",
    }),
    stepBase({
      ...base,
      botType: "test-bot",
      botId: resolveBotId(bots, "test-bot"),
      botName: resolveBotName(bots, "test-bot"),
      phase: "test",
      summary: `Confirm blocker cleared: ${blocker}`,
      detail: "Run build/test. Report STEP DONE.",
    }),
  ];
}

export function countFixableIssues(project: Project): number {
  return (
    project.ops.errors.filter((e) => !e.resolved).length + project.ops.blockers.length
  );
}

export function generateErrorFixPlan(project: Project, bots: BotDefinition[]): ErrorFixMission {
  const steps: ErrorFixStep[] = [];

  for (const error of project.ops.errors.filter((e) => !e.resolved)) {
    steps.push(...stepsForError(error, bots));
  }

  project.ops.blockers.forEach((blocker, i) => {
    steps.push(...stepsForBlocker(blocker, i, bots));
  });

  return {
    id: uid("efm"),
    status: steps.length > 0 ? "planned" : "idle",
    steps,
  };
}

export function resetErrorFixMission(project: Project, bots: BotDefinition[]): ErrorFixMission {
  return generateErrorFixPlan(project, bots);
}

export function toggleStepIncluded(mission: ErrorFixMission, stepId: string): ErrorFixMission {
  return {
    ...mission,
    steps: mission.steps.map((s) =>
      s.id === stepId ? { ...s, included: s.included === false ? true : false } : s,
    ),
  };
}

export function toggleIssueIncluded(mission: ErrorFixMission, sourceId: string): ErrorFixMission {
  const group = mission.steps.filter((s) => s.sourceId === sourceId);
  const allOn = group.every((s) => s.included !== false);
  return {
    ...mission,
    steps: mission.steps.map((s) =>
      s.sourceId === sourceId ? { ...s, included: !allOn } : s,
    ),
  };
}

export function selectedSteps(mission: ErrorFixMission): ErrorFixStep[] {
  return mission.steps.filter((s) => s.included !== false);
}

export function markFixStepDone(mission: ErrorFixMission, stepId: string): ErrorFixMission {
  return {
    ...mission,
    steps: mission.steps.map((s) => (s.id === stepId ? { ...s, status: "done" } : s)),
  };
}

export function markAllIncludedStepsDone(mission: ErrorFixMission): ErrorFixMission {
  return {
    ...mission,
    steps: mission.steps.map((s) =>
      s.included !== false ? { ...s, status: "done" as const } : s,
    ),
  };
}

export function allIncludedStepsDone(mission: ErrorFixMission): boolean {
  const included = selectedSteps(mission);
  return included.length > 0 && included.every((s) => s.status === "done");
}

/** @deprecated use allIncludedStepsDone */
export function allFixStepsDone(mission: ErrorFixMission): boolean {
  return allIncludedStepsDone(mission);
}

export function completeErrorFix(project: Project): Project {
  const mission = project.ops.errorFixMission;
  const now = new Date().toISOString();

  return {
    ...project,
    ops: {
      ...project.ops,
      errors: project.ops.errors.map((e) => ({ ...e, resolved: true })),
      blockers: [],
      errorFixMission: mission
        ? { ...mission, status: "complete", completedAt: now }
        : { id: uid("efm"), status: "complete", completedAt: now, steps: [] },
      stability: {
        ...project.ops.stability,
        label: "Improved after fix pass",
        status: "good",
        score: Math.min(100, project.ops.stability.score + 10),
      },
    },
  };
}

function phaseLabel(phase: ErrorFixStep["phase"]): string {
  if (phase === "fix") return "Builder";
  if (phase === "debug") return "Debug";
  if (phase === "test") return "Test";
  if (phase === "security") return "Security";
  return phase;
}

const WORKER_RULES = `Rules:
- Minimal diff. Match repo conventions.
- Run build/test if project has them.
- After each step reply: STEP N DONE — one line summary
- Mode: caveman — short, direct. No essay.`;

export function buildErrorFixBundle(
  project: Project,
  mission: ErrorFixMission,
  state: MissionControlState,
): string {
  const steps = selectedSteps(mission);
  if (steps.length === 0) return "";

  const godBotRel = resolveGodBotRelativePath(project);
  const godBotPath = `C:\\Projects\\Project Command\\AI-COMMAND-CENTER\\${godBotRel.replace(/\//g, "\\")}`;
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";
  const issues = [...new Set(steps.map((s) => s.errorTitle))];

  const orchestratorPlan = steps
    .map((s, i) => `${i + 1}. ${s.botName} (${phaseLabel(s.phase)}) → ${s.errorTitle}: ${s.summary}`)
    .join("\n");

  const godInsight = project.ops.godModeIdeas[0];

  const boot = `# FIX MISSION — ${project.name}
Jeff selected ${issues.length} issue(s), ${steps.length} bot step(s). Fix before shipping.

═══════════════════════════════════════
CONTROL TOWER — MASTER ORCHESTRATOR
═══════════════════════════════════════
Read first:
1. AI-COMMAND-CENTER/CONTROL_TOWER.md
2. AI-COMMAND-CENTER/PROJECT_INDEX.md
3. AI-COMMAND-CENTER/${godBotRel}
4. Repo README.md + AGENTS.md if exist

Project path: ${project.path ?? "CONFIRM WITH JEFF"}
Voice: ${caveman ? "CAVEman — short, direct, no fluff" : "normal"}
Jeff mode: ${project.jeffMode}

You are the orchestrator. Run these bot steps IN ORDER. Do not skip.
Each step = one bot persona. Complete step → report STEP N DONE → next step.

Orchestration plan (Jeff checked these):
${orchestratorPlan}
${godInsight ? `\nGod Mode insight: ${godInsight.insight}` : ""}

═══════════════════════════════════════
GOD BOT BOOT
═══════════════════════════════════════
Load ${godBotPath}
Jeff wants: fix selected errors/blockers below. Ship-ready when done.

Issues in this mission:
${issues.map((t) => `- ${t}`).join("\n")}

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
Issue: ${step.errorTitle}
Task: ${step.summary}
Detail: ${step.detail}
${bot?.role ? `Role: ${bot.role}` : ""}
Repo: ${project.path ?? "CONFIRM PATH"}

${WORKER_RULES}

Execute STEP ${stepNum} now. When done reply exactly:
STEP ${stepNum} DONE — [one line what you fixed]
`);
  }

  const footer = `
═══════════════════════════════════════
MISSION COMPLETE
═══════════════════════════════════════
When ALL ${stepNum} steps done, reply:
FIX MISSION COMPLETE — build passes, tests green, Jeff can ship.

Jeff marks complete in Jeff OS Easy Mode.
`;

  return boot + blocks.join("\n") + footer;
}

export function groupStepsByIssue(steps: ErrorFixStep[]) {
  const map = new Map<string, { sourceId: string; title: string; steps: ErrorFixStep[] }>();
  for (const s of steps) {
    const key = s.sourceId;
    if (!map.has(key)) map.set(key, { sourceId: key, title: s.errorTitle, steps: [] });
    map.get(key)!.steps.push(s);
  }
  return [...map.values()];
}
