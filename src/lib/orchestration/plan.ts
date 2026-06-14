import type {
  BotDefinition,
  BotTypeId,
  FeatureBotStep,
  InterfaceId,
  ModelClassId,
  OrchestrationPlan,
  Project,
  ProjectFeature,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const PIPELINE: {
  phase: FeatureBotStep["phase"];
  botType: BotTypeId;
  role: string;
  simple?: boolean;
}[] = [
  { phase: "spec", botType: "spec-bot", role: "Requirements + acceptance criteria", simple: true },
  { phase: "architect", botType: "architect-bot", role: "Design + data flow", simple: false },
  { phase: "build", botType: "builder-bot", role: "Implementation", simple: true },
  { phase: "test", botType: "test-bot", role: "Tests + verify", simple: true },
  { phase: "security", botType: "security-risk-bot", role: "Security scan + fixes", simple: false },
  { phase: "docs", botType: "docs-bot", role: "Docs + README", simple: true },
];

function resolveBotId(bots: BotDefinition[], type: BotTypeId): string {
  return bots.find((b) => b.type === type)?.id ?? "bot-builder";
}

function stepsForFeature(
  feature: ProjectFeature,
  bots: BotDefinition[],
  costPattern: OrchestrationPlan["costPattern"],
): FeatureBotStep[] {
  const isSimple =
    feature.type === "nice-to-have" ||
    feature.priority === "P3" ||
    (costPattern === "cheap" && feature.type !== "core");

  return PIPELINE.filter((p) => !(isSimple && p.phase === "architect")).map((p) => {
    const useCheap = costPattern === "cheap" || (costPattern === "mixed" && p.simple);
    const useStrong = costPattern === "strong" || (costPattern === "mixed" && !p.simple);

    let modelClass: ModelClassId = "balanced";
    let iface: InterfaceId = "cursor";

    if (p.phase === "spec" || p.phase === "architect") {
      iface = "regular-claude";
      modelClass = useStrong ? "planning-heavy" : "cheap-fast";
    } else if (p.phase === "build") {
      iface = "cursor";
      modelClass = useStrong ? "code-heavy" : "cheap-fast";
    } else if (p.phase === "security") {
      modelClass = useStrong ? "review-heavy" : "balanced";
    }

    return {
      botType: p.botType,
      botId: resolveBotId(bots, p.botType),
      phase: p.phase,
      status: "planned" as const,
      interface: iface,
      modelClass,
      summary: `${p.role} for ${feature.name}`,
    };
  });
}

export function generateOrchestrationPlan(
  project: Project,
  bots: BotDefinition[],
  costPattern: OrchestrationPlan["costPattern"] = "mixed",
): OrchestrationPlan {
  const features = project.orchestration?.features ?? [];
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };

  const sorted = [...features].sort((a, b) => {
    const ta = a.type === "core" ? 0 : a.type === "nice-to-have" ? 1 : 2;
    const tb = b.type === "core" ? 0 : b.type === "nice-to-have" ? 1 : 2;
    if (ta !== tb) return ta - tb;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const buildOrder = sorted.map((f) => f.id);

  const parallelGroups: string[][] = [];
  const cores = sorted.filter((f) => f.type === "core" && f.priority !== "P3");
  const rest = sorted.filter((f) => !cores.includes(f));
  if (cores.length >= 2) parallelGroups.push(cores.slice(0, 2).map((f) => f.id));
  for (const f of rest) parallelGroups.push([f.id]);

  const botAssignments: OrchestrationPlan["botAssignments"] = [];
  for (const step of PIPELINE) {
    const assigned = sorted.filter((f) => {
      const steps = stepsForFeature(f, bots, costPattern);
      return steps.some((s) => s.phase === step.phase);
    });
    if (assigned.length === 0) continue;
    botAssignments.push({
      botType: step.botType,
      botId: resolveBotId(bots, step.botType),
      role: step.role,
      featureIds: assigned.map((f) => f.id),
    });
  }

  const modelNotes =
    costPattern === "cheap"
      ? "Cheap-fast models for simple steps. Skip architect on nice-to-have."
      : costPattern === "strong"
        ? "Deep reasoning + code-heavy on core paths. Full pipeline every feature."
        : "Mixed: cheap on docs/tests, strong on build + security.";

  return {
    id: uid("plan"),
    approved: false,
    costPattern,
    summary: `${sorted.length} features · ${botAssignments.length} bot roles · ${costPattern} routing`,
    buildOrder,
    botAssignments,
    parallelGroups,
    modelNotes,
    generatedAt: new Date().toISOString(),
  };
}

export function applyPlanToFeatures(
  features: ProjectFeature[],
  plan: OrchestrationPlan,
  bots: BotDefinition[],
): ProjectFeature[] {
  return features.map((f) => ({
    ...f,
    assignedSteps: stepsForFeature(f, bots, plan.costPattern),
    status: f.status === "idea" ? "planning" : f.status,
    updatedAt: new Date().toISOString(),
  }));
}

export function approvePlan(project: Project, bots: BotDefinition[]): Project {
  const orch = project.orchestration!;
  if (!orch.plan) return project;

  const features = applyPlanToFeatures(orch.features, orch.plan, bots).map((f) => ({
    ...f,
    status:
      f.status === "planning" || f.status === "idea" || f.status === "not-built"
        ? ("building" as const)
        : f.status,
  }));

  return {
    ...project,
    orchestration: {
      ...orch,
      features,
      plan: { ...orch.plan, approved: true, approvedAt: new Date().toISOString() },
      planningStatus: "building",
    },
    ops: {
      ...project.ops,
      buildPhase: "Orchestrated build",
      whatsNext: features.filter((f) => f.status === "building").map((f) => f.name),
    },
  };
}

export function rerunOrchestration(
  project: Project,
  bots: BotDefinition[],
  costPattern?: OrchestrationPlan["costPattern"],
): Project {
  const orch = project.orchestration!;
  const pattern = costPattern ?? orch.plan?.costPattern ?? "mixed";
  const plan = generateOrchestrationPlan(project, bots, pattern);
  const features = applyPlanToFeatures(orch.features, plan, bots);

  return {
    ...project,
    orchestration: {
      ...orch,
      features,
      plan: { ...plan, approved: false },
      planningStatus: "draft",
    },
  };
}
