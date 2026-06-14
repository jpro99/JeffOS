import type {
  AppSettings,
  AutonomyLevel,
  BotDefinition,
  BotTypeId,
  CostSensitivity,
  InterfaceId,
  ModelClassId,
  OptimizeFor,
  Project,
  RiskLevel,
  RoutingDecision,
  RoutingPreset,
  TaskSize,
  TaskTypeId,
} from "@/lib/types";

export interface RoutingInput {
  taskType: TaskTypeId;
  taskSize: TaskSize;
  optimizeFor: OptimizeFor;
  autonomyLevel: AutonomyLevel;
  riskLevel: RiskLevel;
  costSensitivity: CostSensitivity;
  project?: Project;
  settings: AppSettings;
  presets: RoutingPreset[];
  bots: BotDefinition[];
}

const TASK_BOT_MAP: Partial<Record<TaskTypeId, BotTypeId>> = {
  planning: "architect-bot",
  architecture: "architect-bot",
  feature: "builder-bot",
  bugfix: "debug-bot",
  refactor: "refactor-bot",
  test: "test-bot",
  review: "reviewer-bot",
  deploy: "deployment-bot",
  docs: "docs-bot",
  security: "security-risk-bot",
  prompt: "prompt-bot",
  integration: "integration-bot",
  ux: "ux-bot",
  "data-model": "data-model-bot",
  audit: "audit-bot",
  "cost-analysis": "cost-bot",
  exploration: "spec-bot",
};

function scoreInterface(input: RoutingInput): { id: InterfaceId; reasons: string[]; score: number }[] {
  const reasons = (iface: InterfaceId, why: string) => ({ id: iface, reasons: [why], score: 0 });

  const scores: Record<InterfaceId, { score: number; reasons: string[] }> = {
    cursor: { score: 40, reasons: ["Default hub — Cursor is Jeff's main OS"] },
    "claude-code": { score: 20, reasons: [] },
    "regular-claude": { score: 15, reasons: [] },
    "future-custom": { score: 5, reasons: [] },
  };

  const add = (id: InterfaceId, pts: number, reason: string) => {
    scores[id].score += pts;
    scores[id].reasons.push(reason);
  };

  if (["planning", "architecture", "exploration", "prompt"].includes(input.taskType)) {
    add("regular-claude", 35, "Planning/spec work fits Regular Claude");
    add("cursor", -10, "Less ideal for pure planning");
  }

  if (["feature", "bugfix", "ux"].includes(input.taskType) && input.taskSize !== "epic") {
    add("cursor", 30, "Fast edits and UI work — Cursor wins");
  }

  if (["refactor", "test", "integration"].includes(input.taskType) || input.taskSize === "large" || input.taskSize === "epic") {
    add("claude-code", 40, "Multi-file / terminal-heavy work — Claude Code");
  }

  if (input.autonomyLevel === "high") {
    add("claude-code", 25, "High autonomy → autonomous coding");
  }

  if (input.taskSize === "tiny" || input.taskSize === "small") {
    add("cursor", 20, "Small task — quick Cursor pass");
  }

  if (input.optimizeFor === "speed" && input.taskSize !== "epic") {
    add("cursor", 15, "Speed priority → Cursor");
  }

  if (input.optimizeFor === "quality" && input.riskLevel === "high") {
    add("regular-claude", 15, "High risk quality work — plan first in Claude");
  }

  if (input.project?.preferredInterface) {
    add(input.project.preferredInterface, 20, `Project prefers ${input.project.preferredInterface}`);
  }

  if (input.settings.defaultInterface) {
    add(input.settings.defaultInterface, 10, "Global default interface bias");
  }

  const preset = input.presets.find(
    (p) => p.taskType === input.taskType && (!p.projectId || p.projectId === input.project?.id),
  );
  if (preset) {
    add(preset.interface, 50, `Saved preset: ${preset.name}`);
  }

  return Object.entries(scores).map(([id, v]) => ({
    id: id as InterfaceId,
    reasons: v.reasons,
    score: v.score,
  }));
}

function scoreModelClass(input: RoutingInput): { id: ModelClassId; reasons: string[]; score: number }[] {
  const scores: Record<ModelClassId, { score: number; reasons: string[] }> = {
    "cheap-fast": { score: 10, reasons: [] },
    balanced: { score: 25, reasons: ["Safe default balance"] },
    "deep-reasoning": { score: 10, reasons: [] },
    "code-heavy": { score: 15, reasons: [] },
    "review-heavy": { score: 10, reasons: [] },
    "planning-heavy": { score: 10, reasons: [] },
    "long-context": { score: 10, reasons: [] },
    "autonomous-heavy": { score: 10, reasons: [] },
  };

  const add = (id: ModelClassId, pts: number, reason: string) => {
    scores[id].score += pts;
    scores[id].reasons.push(reason);
  };

  if (input.costSensitivity === "high" || input.settings.costSaveMode || input.optimizeFor === "cost") {
    add("cheap-fast", 40, "Cost-sensitive → cheap-fast");
  }

  if (["planning", "architecture", "exploration"].includes(input.taskType)) {
    add("planning-heavy", 35, "Planning task → planning-heavy");
    add("deep-reasoning", 20, "Architecture needs deep reasoning");
  }

  if (["feature", "bugfix", "refactor", "integration", "test"].includes(input.taskType)) {
    add("code-heavy", 35, "Implementation → code-heavy");
  }

  if (input.taskType === "review" || input.taskType === "audit" || input.taskType === "security") {
    add("review-heavy", 40, "Review/audit → review-heavy");
  }

  if (input.taskSize === "epic" || input.taskSize === "large") {
    add("long-context", 30, "Large scope → long-context");
  }

  if (input.autonomyLevel === "high") {
    add("autonomous-heavy", 35, "High autonomy → autonomous-heavy");
  }

  if (input.project?.preferredModelClass) {
    add(input.project.preferredModelClass, 25, "Project model preference");
  }

  if (input.settings.preferredModelClass) {
    add(input.settings.preferredModelClass, 15, "Global model preference");
  }

  return Object.entries(scores).map(([id, v]) => ({
    id: id as ModelClassId,
    reasons: v.reasons,
    score: v.score,
  }));
}

function pickBotType(input: RoutingInput, iface: InterfaceId): BotTypeId {
  const preset = input.presets.find(
    (p) => p.taskType === input.taskType && (!p.projectId || p.projectId === input.project?.id),
  );
  if (preset?.botType) return preset.botType;

  if (input.taskType === "planning" && iface === "regular-claude") return "architect-bot";
  if (input.taskType === "prompt") return "prompt-bot";

  const mapped = TASK_BOT_MAP[input.taskType];
  if (mapped) return mapped;

  if (iface === "claude-code") return "builder-bot";
  if (iface === "regular-claude") return "spec-bot";
  return "builder-bot";
}

function pickBotId(bots: BotDefinition[], botType: BotTypeId, projectId?: string): string {
  const projectBot = bots.find((b) => b.type === botType && projectId && b.projectIds.includes(projectId));
  if (projectBot) return projectBot.id;
  if (botType === "control-tower") return "bot-control-tower";
  if (botType === "project-god-bot" && projectId) {
    const god = bots.find((b) => b.type === "project-god-bot" && b.projectIds.includes(projectId));
    if (god) return god.id;
  }
  const fallback = bots.find((b) => b.type === botType);
  return fallback?.id ?? "bot-builder";
}

export function computeRouting(input: RoutingInput): RoutingDecision {
  const ifaceScores = scoreInterface(input).sort((a, b) => b.score - a.score);
  const modelScores = scoreModelClass(input).sort((a, b) => b.score - a.score);

  const bestIface = ifaceScores[0];
  const bestModel = modelScores[0];
  const botType = pickBotType(input, bestIface.id);
  const botId = pickBotId(input.bots, botType, input.project?.id);

  const maxScore = Math.max(bestIface.score, 1);
  const confidence = Math.min(0.98, 0.55 + (bestIface.score - (ifaceScores[1]?.score ?? 0)) / maxScore / 4);

  const reasons = [
    ...bestIface.reasons.slice(0, 3),
    ...bestModel.reasons.slice(0, 2),
    `Bot: ${botType.replace(/-/g, " ")} for ${input.taskType}`,
  ];

  return {
    interface: bestIface.id,
    botType,
    botId,
    modelClass: bestModel.id,
    confidence: Math.round(confidence * 100) / 100,
    reasons: [...new Set(reasons)],
    optimizeFor: input.optimizeFor,
  };
}

export function getInterfaceLabel(id: InterfaceId, interfaces: { id: InterfaceId; name: string }[]): string {
  return interfaces.find((i) => i.id === id)?.name ?? id;
}

export function getModelLabel(id: ModelClassId, models: { id: ModelClassId; name: string }[]): string {
  return models.find((m) => m.id === id)?.name ?? id;
}
