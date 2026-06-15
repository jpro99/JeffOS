import type { BotDefinition, Project, ProjectFeature, ProjectOrchestration, ProjectScope } from "@/lib/types";
import { resolveSuggestedGodBot } from "@/lib/mission/god-bot-resolver";
import { uid } from "@/lib/utils";

export function defaultScope(project: Project): ProjectScope {
  const platforms: string[] = [];
  const stack = project.stack.join(" ").toLowerCase();
  if (stack.includes("next") || stack.includes("vite") || stack.includes(".net")) platforms.push("web");
  if (stack.includes("capacitor") || stack.includes("flutter")) platforms.push("mobile");

  return {
    pitch: project.description.slice(0, 120),
    targetUsers: project.type.includes("Legal") ? "Attorneys and legal teams" : "Jeff + target users TBD",
    platforms: platforms.length ? platforms : ["web"],
    techPreferences: project.stack.slice(0, 4).join(", ") || "TBD",
    constraints: {
      budget: project.priority === "P0" ? "Focus spend on P0" : "Cost-save when possible",
      timeline: project.priority === "P0" ? "Ship soon" : "Flexible",
      complexity: project.ops.riskLevel,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyOrchestration(project: Project): ProjectOrchestration {
  return {
    scope: defaultScope(project),
    features: [],
    brainstormCandidates: [],
    plan: null,
    integrationSuggestions: [],
    securityScore: project.ops.security.score,
    planningStatus: "draft",
  };
}

export function ensureOrchestration(project: Project): ProjectOrchestration {
  if (project.orchestration) {
    return {
      ...createEmptyOrchestration(project),
      ...project.orchestration,
      scope: { ...defaultScope(project), ...project.orchestration.scope },
    };
  }
  return createEmptyOrchestration(project);
}

export function attachOrchestration(project: Project): Project {
  return { ...project, orchestration: ensureOrchestration(project) };
}

export function createFeature(
  partial: Pick<ProjectFeature, "name" | "description"> & Partial<ProjectFeature>,
): ProjectFeature {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? uid("feat"),
    name: partial.name,
    description: partial.description,
    priority: partial.priority ?? "P2",
    type: partial.type ?? "core",
    status: partial.status ?? "idea",
    securityStatus: partial.securityStatus ?? "not-reviewed",
    assignedSteps: partial.assignedSteps ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
  };
}

export function createProjectShell(input: {
  name: string;
  pitch: string;
  description: string;
  goals: string[];
  platforms: string[];
  bots: BotDefinition[];
  targetPath?: string;
}): Project {
  const now = new Date().toISOString();
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `proj-${slug}`;

  const shellBase: Project = {
    id,
    name: input.name,
    slug,
    type: "Greenfield",
    stack: ["TBD"],
    status: "idea",
    priority: "P2",
    description: input.description,
    goals: input.goals,
    risks: [],
    roadmap: [],
    assignedGodBotId: "bot-control-tower",
    workerBotIds: ["bot-spec", "bot-architect", "bot-builder"],
    preferredInterface: "cursor",
    preferredModelClass: "balanced",
    activeBotStrategy: "Control Tower → Spec → Build",
    godBotFile: `projects/${slug}.md`,
    jeffMode: "caveman",
    lastUpdated: now,
    discoverySource: "manual",
    path: input.targetPath?.trim() || undefined,
    pathExists: false,
    discoveredAt: now,
    ops: {
      plainSummary: input.pitch || input.description,
      readinessLevel: "idea",
      buildPhase: "Scope intake",
      percentComplete: 5,
      readinessScore: 10,
      demoReadyScore: 0,
      productionReadyScore: 0,
      working: [],
      blocked: [],
      whatsNext: ["Define scope", "Brainstorm features", "Approve orchestration plan"],
      security: { score: 50, label: "Not reviewed", status: "warn" },
      stability: { score: 50, label: "Not built", status: "warn" },
      quality: { score: 50, label: "Not built", status: "warn" },
      riskLevel: "medium",
      technicalDebt: "low",
      launchConfidence: 5,
      missingPieces: ["Scope", "Features", "Plan approval"],
      hardeningSteps: [],
      blockers: [],
      errors: [],
      nextAction: {
        title: "Define project scope and features",
        milestone: "Planning approved",
        unresolvedIssue: "No features yet",
        recommendedPrompt: "Spec Bot: draft scope + feature list from Jeff's pitch.",
        whyItMatters: "Orchestration needs scope first",
        effort: "low",
        impact: "high",
        priority: "P1",
        taskType: "planning",
        quickAction: "what-to-do",
      },
      godModeIdeas: [],
      notes: "",
    },
    orchestration: {
      scope: {
        pitch: input.pitch,
        targetUsers: "",
        platforms: input.platforms.length ? input.platforms : ["web"],
        techPreferences: "",
        constraints: { budget: "", timeline: "", complexity: "medium" },
        updatedAt: now,
      },
      features: [],
      brainstormCandidates: [],
      plan: null,
      integrationSuggestions: [],
      securityScore: 50,
      planningStatus: "draft",
    },
  };

  const godBot = resolveSuggestedGodBot(shellBase, input.bots);
  const project: Project = {
    ...shellBase,
    assignedGodBotId: godBot.id,
    activeBotStrategy: `${godBot.name} → Spec → Build`,
    preferredInterface: godBot.preferredInterface,
    preferredModelClass: godBot.preferredModelClass,
  };

  return project;
}
