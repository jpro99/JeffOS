import { ensureOrchestration } from "@/lib/orchestration/defaults";
import { resolveSuggestedGodBot } from "@/lib/mission/god-bot-resolver";
import { featuresFromIntent } from "@/lib/mission/intent";
import {
  applyScopeRecommendations,
  recommendScope,
  type IntakeInput,
} from "@/lib/mission/tech-recommendations";
import {
  buildSuggestion,
  planDraftProject,
  type BuildMode,
  type ProjectSuggestion,
} from "@/lib/mission/new-project-wizard";
import type { BotDefinition, Project } from "@/lib/types";

export type { BuildMode };

export interface SuggestedBotCard {
  role: string;
  botType: string;
  botId: string;
  botName: string;
  featureNames: string[];
  why: string;
  isGodBot?: boolean;
}

export interface ProjectBotSuggestion {
  buildMode: BuildMode;
  recommendedBuildMode: BuildMode;
  godBotId: string;
  godBotName: string;
  godBotWhy: string;
  workerBotIds: string[];
  strategyNote: string;
  headline: string;
  approach: string;
  botSummary: string;
  featureNames: string[];
  botCards: SuggestedBotCard[];
  scopeSummary: ProjectSuggestion;
  plannedProject: Project;
}

export function intakeFromProject(project: Project): IntakeInput {
  const orch = ensureOrchestration(project);
  return {
    name: project.name,
    pitch: orch.scope.pitch || project.description.slice(0, 120),
    description: project.description,
    goals: project.goals,
    platforms: orch.scope.platforms.length ? orch.scope.platforms : ["web"],
  };
}

function projectIntentText(project: Project): string {
  const intake = intakeFromProject(project);
  return [intake.pitch, intake.description, ...intake.goals].filter(Boolean).join("\n").trim();
}

export function recommendBuildMode(project: Project): BuildMode {
  const text = projectIntentText(project).toLowerCase();

  if (
    /\b(legal|hipaa|bankruptcy|attorney|stripe|payment|billing|dunning|webhook|rls|security audit)\b/.test(
      text,
    )
  ) {
    return "careful";
  }

  if (
    project.discoverySource === "manual" ||
    project.type === "Greenfield" ||
    /\b(greenfield|from scratch|brand new|mvp|new app|breakthrough)\b/.test(text)
  ) {
    return "god";
  }

  return "standard";
}

function workerIdsFromPlan(project: Project): string[] {
  const assignments = project.orchestration?.plan?.botAssignments ?? [];
  const ids = assignments
    .map((a) => a.botId)
    .filter((id, i, arr) => arr.indexOf(id) === i);
  return ids.length ? ids : ["bot-spec", "bot-builder", "bot-test"];
}

function workerIdsFromCards(cards: SuggestedBotCard[]): string[] {
  const ids = cards
    .filter((c) => !c.isGodBot)
    .map((c) => c.botId)
    .filter((id, i, arr) => arr.indexOf(id) === i);
  return ids.length ? ids : ["bot-spec", "bot-builder", "bot-test"];
}

export function botsLineupMatchesSuggestion(
  project: Project,
  bots: BotDefinition[],
  buildMode?: BuildMode,
): boolean {
  const suggestion = suggestBotsForProject(project, bots, buildMode);
  const workers = [...project.workerBotIds].sort().join(",");
  const suggested = [...suggestion.workerBotIds].sort().join(",");
  const mode = project.orchestration?.botSuggestion?.buildMode ?? buildMode ?? recommendBuildMode(project);
  return (
    project.assignedGodBotId === suggestion.godBotId &&
    workers === suggested &&
    mode === suggestion.buildMode
  );
}

function buildStrategyNote(
  godBot: BotDefinition,
  workerIds: string[],
  bots: BotDefinition[],
  buildMode: BuildMode,
): string {
  const modeLabel =
    buildMode === "god" ? "God Mode" : buildMode === "careful" ? "Careful" : "Standard";
  const workers = workerIds
    .map((id) => bots.find((b) => b.id === id)?.name ?? id)
    .slice(0, 5);
  return `${modeLabel}: ${godBot.name} → ${workers.join(" → ")}`;
}

function enrichBotCards(project: Project, bots: BotDefinition[], godBot: BotDefinition): SuggestedBotCard[] {
  const assignments = project.orchestration?.plan?.botAssignments ?? [];
  const cards = assignments.map((a) => {
    const bot = bots.find((b) => b.id === a.botId);
    const featureNames = a.featureIds
      .map((id) => project.orchestration?.features.find((f) => f.id === id)?.name)
      .filter(Boolean) as string[];
    return {
      role: a.role,
      botType: a.botType,
      botId: a.botId,
      botName: bot?.name ?? a.role,
      featureNames,
      why: bot?.description ?? a.role,
    };
  });

  return [
    {
      role: godBot.role,
      botType: godBot.type,
      botId: godBot.id,
      botName: godBot.name,
      featureNames: [],
      why: godBot.description,
      isGodBot: true,
    },
    ...cards,
  ];
}

export function suggestBotsForProject(
  project: Project,
  bots: BotDefinition[],
  buildMode?: BuildMode,
): ProjectBotSuggestion {
  const mode = buildMode ?? recommendBuildMode(project);
  const intake = intakeFromProject(project);
  const scoped = applyScopeRecommendations(project, recommendScope(intake));
  const planned = planDraftProject(scoped, bots, mode);
  const scopeSummary = buildSuggestion(scoped, bots);

  const godBot = resolveSuggestedGodBot(planned, bots);
  const botCards = enrichBotCards(planned, bots, godBot);
  const workerBotIds = workerIdsFromCards(botCards);
  const strategyNote = buildStrategyNote(godBot, workerBotIds, bots, mode);

  return {
    buildMode: mode,
    recommendedBuildMode: recommendBuildMode(project),
    godBotId: godBot.id,
    godBotName: godBot.name,
    godBotWhy: godBot.description,
    workerBotIds,
    strategyNote,
    headline: scopeSummary.headline,
    approach: scopeSummary.approach,
    botSummary: scopeSummary.botSummary,
    featureNames: scopeSummary.featureNames,
    botCards,
    scopeSummary,
    plannedProject: planned,
  };
}

export function inferGoalsFromScope(project: Project): string[] {
  const intent = projectIntentText(project);
  if (!intent.trim()) return [];
  return featuresFromIntent(intent)
    .slice(0, 6)
    .map((f) => f.name);
}

export function redoScopeFromMission(project: Project): Project {
  const intake = intakeFromProject(project);
  const rec = recommendScope(intake);
  const withScope = applyScopeRecommendations(project, rec);
  const goals = project.goals.length ? project.goals : inferGoalsFromScope(project);

  return {
    ...withScope,
    goals,
    lastUpdated: new Date().toISOString(),
  };
}

export function applyBotsToProject(
  project: Project,
  bots: BotDefinition[],
  buildMode?: BuildMode,
): Project {
  const base: Project = { ...project, orchestration: ensureOrchestration(project) };
  const suggestion = suggestBotsForProject(base, bots, buildMode);
  const godBot = bots.find((b) => b.id === suggestion.godBotId) ?? resolveSuggestedGodBot(project, bots);
  const planned = suggestion.plannedProject;
  const baseOrch = ensureOrchestration(project);
  const plannedOrch = planned.orchestration!;

  return {
    ...project,
    assignedGodBotId: suggestion.godBotId,
    workerBotIds: suggestion.workerBotIds,
    activeBotStrategy: suggestion.strategyNote,
    preferredInterface: godBot.preferredInterface,
    preferredModelClass: godBot.preferredModelClass,
    godBotFile: project.godBotFile ?? `projects/${project.slug}.md`,
    orchestration: {
      ...baseOrch,
      scope: plannedOrch.scope,
      plan: plannedOrch.plan,
      features: plannedOrch.features,
      integrationSuggestions: plannedOrch.integrationSuggestions,
      botSuggestion: {
        buildMode: suggestion.buildMode,
        generatedAt: new Date().toISOString(),
        recommendedGodBotId: suggestion.godBotId,
        recommendedWorkerBotIds: suggestion.workerBotIds,
        strategyNote: suggestion.strategyNote,
        headline: suggestion.headline,
        approach: suggestion.approach,
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function usesDefaultBotLineup(project: Project): boolean {
  const workers = [...project.workerBotIds].sort().join(",");
  const defaultWorkers = ["bot-architect", "bot-builder", "bot-spec"].sort().join(",");
  return project.assignedGodBotId === "bot-control-tower" && workers === defaultWorkers;
}
