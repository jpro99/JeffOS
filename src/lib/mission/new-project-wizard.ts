import { brainstormFeatures } from "@/lib/orchestration/brainstorm";
import { createProjectShell } from "@/lib/orchestration/defaults";
import { suggestIntegrations } from "@/lib/orchestration/integrations";
import {
  applyPlanToFeatures,
  approvePlan,
  generateOrchestrationPlan,
} from "@/lib/orchestration/plan";
import { buildFromIntent } from "@/lib/mission/builder-router";
import { buildCommandMissionBundle } from "@/lib/mission/command-session";
import { flattenMissionSteps } from "@/lib/mission/bundle";
import { featuresFromIntent } from "@/lib/mission/intent";
import type { BotDefinition, CostPattern, MissionControlState, Project } from "@/lib/types";
import { uid } from "@/lib/utils";
import {
  applyScopeRecommendations,
  recommendScope,
  type IntakeInput,
  type ScopeRecommendations,
} from "@/lib/mission/tech-recommendations";

export type WizardStep = 1 | 2 | 3 | 4;

export type BuildMode = "god" | "standard" | "careful";

export type { IntakeInput };

export interface ProjectSuggestion {
  headline: string;
  approach: string;
  featureNames: string[];
  botSummary: string;
  mvpNote: string;
  techPreferences: string;
  techLines: string[];
  techRationale: string;
  timeline: string;
  timelinePhases: { phase: string; duration: string }[];
  budget: string;
  scope: ScopeRecommendations;
}

export const WIZARD_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Your idea" },
  { step: 2, label: "AI plan" },
  { step: 3, label: "Create folder" },
  { step: 4, label: "Launch" },
];

export const BUILD_MODES: {
  id: BuildMode;
  label: string;
  tagline: string;
  detail: string;
}[] = [
  {
    id: "god",
    label: "God Mode",
    tagline: "Full breakthrough — master programmer",
    detail: "Correct answers only. No ghosting. Full bot pipeline. Best for new apps.",
  },
  {
    id: "standard",
    label: "Standard",
    tagline: "Balanced bots — ship steady",
    detail: "Spec → Build → Test. Mixed models. Good default.",
  },
  {
    id: "careful",
    label: "Careful",
    tagline: "Verify every step before ship",
    detail: "Same bots + hard rule: npm run build + Rescan gates ship. No shortcuts.",
  },
];

export function draftProject(input: IntakeInput, bots: BotDefinition[]): Project {
  const shell = createProjectShell({ ...input, bots });
  const rec = recommendScope(input);
  return applyScopeRecommendations(
    {
      ...shell,
      orchestration: {
        ...shell.orchestration!,
        scope: {
          ...shell.orchestration!.scope,
          platforms: input.platforms.length ? input.platforms : ["web"],
        },
      },
    },
    rec,
  );
}

function combinedIntent(input: IntakeInput): string {
  const parts = [input.pitch, input.description, ...input.goals].filter(Boolean);
  return parts.join("\n").trim();
}

export function planDraftProject(
  draft: Project,
  bots: BotDefinition[],
  buildMode: BuildMode,
): Project {
  const intake: IntakeInput = {
    name: draft.name,
    pitch: draft.orchestration?.scope.pitch ?? draft.description,
    description: draft.description,
    goals: draft.goals,
    platforms: draft.orchestration?.scope.platforms ?? ["web"],
  };
  const scoped = applyScopeRecommendations(draft, recommendScope(intake));

  const intent = combinedIntent(intake);
  const orch = scoped.orchestration!;
  const fromIntent = featuresFromIntent(intent);
  const mergedFeatures = [...orch.features];
  for (const nf of fromIntent) {
    if (!mergedFeatures.some((f) => f.name.toLowerCase() === nf.name.toLowerCase())) {
      mergedFeatures.push(nf);
    }
  }

  const withFeatures: Project = {
    ...scoped,
    orchestration: {
      ...orch,
      scope: { ...orch.scope, pitch: inputPitch(scoped), updatedAt: new Date().toISOString() },
      features: mergedFeatures,
    },
  };

  const candidates = brainstormFeatures(withFeatures);
  for (const c of candidates.slice(0, 2)) {
    if (mergedFeatures.some((f) => f.name.toLowerCase() === c.name.toLowerCase())) continue;
    mergedFeatures.push({
      id: c.id,
      name: c.name,
      description: c.description,
      priority: c.priority,
      type: c.type,
      status: "not-built",
      securityStatus: "not-reviewed",
      assignedSteps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const costPattern = costPatternForMode(buildMode);
  const planned: Project = {
    ...withFeatures,
    orchestration: {
      ...withFeatures.orchestration!,
      features: mergedFeatures,
    },
  };

  const plan = generateOrchestrationPlan(planned, bots, costPattern);
  const features = applyPlanToFeatures(mergedFeatures, plan, bots);
  const integrations =
    orch.integrationSuggestions.length > 0
      ? orch.integrationSuggestions
      : suggestIntegrations(planned);

  return {
    ...planned,
    orchestration: {
      ...planned.orchestration!,
      plan,
      features,
      integrationSuggestions: integrations,
    },
  };
}

function inputPitch(draft: Project): string {
  return draft.orchestration?.scope.pitch || draft.description.slice(0, 120);
}

export function buildSuggestion(draft: Project, bots: BotDefinition[]): ProjectSuggestion {
  const intake: IntakeInput = {
    name: draft.name,
    pitch: draft.orchestration?.scope.pitch ?? draft.description,
    description: draft.description,
    goals: draft.goals,
    platforms: draft.orchestration?.scope.platforms ?? ["web"],
  };
  const scope = recommendScope(intake);
  const planned = planDraftProject(applyScopeRecommendations(draft, scope), bots, "standard");
  const orch = planned.orchestration!;
  const features = orch.features.slice(0, 6);
  const featureNames = features.map((f) => f.name);
  const platforms = orch.scope.platforms.join(", ") || "web";
  const pitch = orch.scope.pitch || planned.description;

  const botSummary =
    orch.plan?.botAssignments
      .slice(0, 5)
      .map((a) => {
        const names = a.featureIds
          .map((id) => orch.features.find((f) => f.id === id)?.name)
          .filter(Boolean)
          .slice(0, 2);
        return `${a.role} → ${names.join(", ") || "features"}`;
      })
      .join(" · ") || "Spec → Architect → Builder → Test → Security → Docs";

  const mvp =
    features.find((f) => /mvp/i.test(f.name)) ??
    features.find((f) => f.priority === "P0") ??
    features[0];

  return {
    headline: `Build ${planned.name} as ${platforms}`,
    approach: `Start with "${pitch}". We split that into ${features.length} features, assign bots in order, verify build before ship.`,
    featureNames,
    botSummary,
    mvpNote: mvp
      ? `Ship first: ${mvp.name} — ${mvp.description.slice(0, 120)}`
      : "Define MVP from your pitch first.",
    techPreferences: scope.techPreferences,
    techLines: scope.techLines,
    techRationale: scope.rationale,
    timeline: scope.timeline,
    timelinePhases: scope.timelinePhases,
    budget: scope.budget,
    scope,
  };
}

export { recommendScope, applyScopeRecommendations, type ScopeRecommendations };

export function costPatternForMode(mode: BuildMode): CostPattern {
  if (mode === "standard") return "mixed";
  return "strong";
}

const CAREFUL_BLOCK = `
═══════════════════════════════════════
CAREFUL MODE — NO GHOSTING
═══════════════════════════════════════
- Every step: real code on disk, not placeholders
- After each feature: npm run build must pass
- Jeff OS Rescan + verify gates ship — honest truth only
- If blocked, say BLOCKED and why — do not skip
`;

export function buildWizardLaunchPrompt(
  planned: Project,
  buildMode: BuildMode,
  state: MissionControlState,
): { prompt: string; project: Project } | null {
  const intent = combinedIntent({
    name: planned.name,
    pitch: planned.orchestration?.scope.pitch ?? "",
    description: planned.description,
    goals: planned.goals,
    platforms: planned.orchestration?.scope.platforms ?? ["web"],
  });

  if (!intent.trim()) return null;

  const approved = approvePlan(planned, state.bots);
  const scope = approved.orchestration?.scope;
  const scopeBlock =
    scope?.techPreferences || scope?.constraints.timeline
      ? `
## Jeff OS recommended scope (honor unless Jeff says otherwise)
- Tech: ${scope?.techPreferences ?? "TBD"}
- Timeline: ${scope?.constraints.timeline ?? "TBD"}
- Budget: ${scope?.constraints.budget ?? "TBD"}
- Platforms: ${scope?.platforms.join(", ") ?? "web"}
`
      : "";

  if (buildMode === "god") {
    const godIntent = `God Mode — ${intent}. Correct answers only. No ghosting. Full pipeline.`;
    const result = buildFromIntent(approved, godIntent, state);
    if (!result) return null;
    return { prompt: result.prompt + scopeBlock, project: result.project };
  }

  let prompt = buildCommandMissionBundle(approved, intent, state) + scopeBlock;
  if (buildMode === "careful") {
    prompt += CAREFUL_BLOCK;
  }

  const flat = flattenMissionSteps(approved);

  return {
    prompt,
    project: {
      ...approved,
      ops: {
        ...approved.ops,
        commandSession: {
          id: uid("cmd"),
          intent,
          createdAt: new Date().toISOString(),
          lastPrompt: prompt,
          stepCount: flat.length,
          featureCount: featuresFromIntent(intent).length,
          combinedIntent: intent,
        },
      },
    },
  };
}

export function botCardsFromProject(project: Project) {
  return (
    project.orchestration?.plan?.botAssignments.map((a) => {
      const names = a.featureIds
        .map((id) => project.orchestration?.features.find((f) => f.id === id)?.name)
        .filter(Boolean);
      return { role: a.role, botType: a.botType, featureNames: names as string[] };
    }) ?? []
  );
}
