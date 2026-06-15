import { ensureOrchestration } from "@/lib/orchestration/defaults";
import { suggestIntegrations } from "@/lib/orchestration/integrations";
import {
  applyPlanToFeatures,
  approvePlan,
  generateOrchestrationPlan,
} from "@/lib/orchestration/plan";
import { buildMissionBundle, flattenMissionSteps } from "@/lib/mission/bundle";
import { greenfieldScaffoldBlock } from "@/lib/mission/build-prerequisites";
import { featuresFromIntent, isVisionIntent, summarizeIntent } from "@/lib/mission/intent";
import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { JEFF_OS_NAME, standardDocsReadBlock } from "@/lib/jeff-os/branding";
import type { MissionControlState, Project } from "@/lib/types";
import { uid } from "@/lib/utils";

export interface CommandSessionResult {
  sessionId: string;
  project: Project;
  prompt: string;
  featureCount: number;
  stepCount: number;
  botRoles: string[];
}

function mergeIntentFeatures(project: Project, intent: string): Project {
  const orch = ensureOrchestration(project);
  const newFeatures = featuresFromIntent(intent);
  const mergedFeatures = [...orch.features];
  for (const nf of newFeatures) {
    const dupe = mergedFeatures.some((f) => f.name.toLowerCase() === nf.name.toLowerCase());
    if (!dupe) mergedFeatures.push(nf);
  }

  return {
    ...project,
    orchestration: {
      ...orch,
      scope: {
        ...orch.scope,
        pitch: intent.trim(),
        updatedAt: new Date().toISOString(),
      },
      features: mergedFeatures,
    },
  };
}

export function buildCommandMissionBundle(
  project: Project,
  intent: string,
  state: MissionControlState,
): string {
  const godBotRel = resolveGodBotRelativePath(project);
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";
  const steps = flattenMissionSteps(project);
  const botRoles = [...new Set(steps.map((s) => s.label.split(" · ")[0]))];

  const header = `# COMMAND SESSION — ${project.name}
Jeff told ${JEFF_OS_NAME}:
"${intent.trim()}"

Mission summary: ${summarizeIntent(intent)}

═══════════════════════════════════════
CONTROL TOWER — MASTER ORCHESTRATOR
═══════════════════════════════════════
Read first:
${standardDocsReadBlock(godBotRel)}
4. Repo README.md + AGENTS.md if exist

Project path: ${project.path ?? "CONFIRM WITH JEFF"}
Voice: ${caveman ? "CAVEman — short, direct, no fluff" : "normal"}
Session bots: ${botRoles.length} roles · ${steps.length} steps

You are the orchestrator. Run bot steps IN ORDER. Do not skip.
Each step → report STEP N DONE → next step.

`;

  const core = buildMissionBundle(project, intent, state);

  const footer = `
═══════════════════════════════════════
SESSION COMPLETE
═══════════════════════════════════════
When ALL steps done, reply:
COMMAND SESSION COMPLETE — ${intent.trim().slice(0, 80)}

Jeff marks progress in Jeff OS → Rescan + verify build.
`;

  return greenfieldScaffoldBlock(project) + header + core + footer;
}

/** Save approved plan → full Cursor prompt on project (localStorage) */
export function persistApprovedBuildPrompt(
  approved: Project,
  intent: string,
  state: MissionControlState,
): Project {
  const trimmed = intent.trim() || approved.orchestration?.scope.pitch || approved.description || approved.name;
  const prompt = buildCommandMissionBundle(approved, trimmed, state);
  const flat = flattenMissionSteps(approved);

  return {
    ...approved,
    ops: {
      ...approved.ops,
      commandSession: {
        id: approved.ops.commandSession?.id ?? uid("cmd"),
        intent: trimmed,
        createdAt: approved.ops.commandSession?.createdAt ?? new Date().toISOString(),
        lastPrompt: prompt,
        stepCount: flat.length,
        featureCount: approved.orchestration?.features.length ?? 0,
      },
    },
  };
}

/** Turn plain English into planned bots + Cursor-ready prompt. */
export function createCommandSession(
  project: Project,
  intent: string,
  state: MissionControlState,
): CommandSessionResult | null {
  const trimmed = intent.trim();
  if (!trimmed) return null;

  const draft = mergeIntentFeatures(project, trimmed);
  const orch = draft.orchestration!;
  const costPattern = isVisionIntent(trimmed)
    ? "strong"
    : state.settings.experienceLevel === "expert"
      ? "mixed"
      : "cheap";

  const plan = generateOrchestrationPlan(draft, state.bots, costPattern);
  const features = applyPlanToFeatures(orch.features, plan, state.bots);
  const integrations =
    orch.integrationSuggestions.length > 0
      ? orch.integrationSuggestions
      : suggestIntegrations(draft);

  const withPlan: Project = {
    ...draft,
    orchestration: {
      ...orch,
      plan,
      features,
      integrationSuggestions: integrations,
      planningStatus: "building",
    },
  };

  const approved = approvePlan(withPlan, state.bots);
  const prompt = buildCommandMissionBundle(approved, trimmed, state);
  const flat = flattenMissionSteps(approved);
  const botRoles = [...new Set(flat.map((s) => s.label.split(" · ")[0]))];
  const newFeatureCount = featuresFromIntent(trimmed).length;

  const sessionId = uid("cmd");

  return {
    sessionId,
    project: {
      ...approved,
      ops: {
        ...approved.ops,
        commandSession: {
          id: sessionId,
          intent: trimmed,
          createdAt: new Date().toISOString(),
          lastPrompt: prompt,
          stepCount: flat.length,
          featureCount: newFeatureCount,
        },
      },
    },
    prompt,
    featureCount: newFeatureCount,
    stepCount: flat.length,
    botRoles,
  };
}
