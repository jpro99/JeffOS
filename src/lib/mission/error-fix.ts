import type {
  BotDefinition,
  BotTypeId,
  ErrorFixMission,
  ErrorFixStep,
  MissionControlState,
  Project,
  ProjectError,
} from "@/lib/types";
import { buildCompactFixPrompt } from "@/lib/mission/cursor-prompts";
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

export function buildErrorFixBundle(
  project: Project,
  mission: ErrorFixMission,
  state: MissionControlState,
): string {
  const steps = selectedSteps(mission);
  if (steps.length === 0) return "";

  const issueTitles = [...new Set(steps.map((s) => s.errorTitle))];
  return buildCompactFixPrompt(project, state, { issueTitles });
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
