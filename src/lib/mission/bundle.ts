import type { BotDefinition, MissionControlState, Project } from "@/lib/types";
import { botPhaseLabel } from "@/lib/ui/experience";
import { resolveGodBotRelativePath } from "@/lib/command-center/doc-paths";
import { formatDocsRead, standardDocsReadBlock } from "@/lib/jeff-os/branding";

const WORKER_RULES = `Rules:
- Minimal diff. Match repo conventions.
- Run build/test if project has them.
- Report: STEP N DONE — one line summary when finished.
- Mode: caveman — short, direct.`;

function workerBlock(
  stepNum: number,
  phase: string,
  featureName: string,
  summary: string,
  bot: BotDefinition | undefined,
  project: Project,
): string {
  const label = botPhaseLabel(phase);
  return `### Step ${stepNum} — ${label} Bot
${bot?.name ?? label}: ${summary}

Feature: ${featureName}
Repo: ${project.path ?? "CONFIRM PATH WITH JEFF"}
${WORKER_RULES}

Task: ${summary}
`;
}

export function buildMissionBundle(
  project: Project,
  intent: string,
  state: MissionControlState,
): string {
  const orch = project.orchestration;
  const features = orch?.features ?? [];
  const plan = orch?.plan;
  const godBot = resolveGodBotRelativePath(project);
  const caveman = state.settings.cavemanDefault || project.jeffMode === "caveman";

  const boot = `# MISSION — ${project.name}
Jeff wants: ${intent.trim() || orch?.scope.pitch || project.description}

## Boot (read once)
${standardDocsReadBlock(godBot)}
4. Repo README.md + AGENTS.md if exist
5. Open repo: ${project.path ?? "see PROJECT_INDEX"}

Voice: ${caveman ? "caveman" : "normal"}
Plan: ${plan?.summary ?? "draft"} · ${plan?.costPattern ?? "mixed"} routing
${plan?.modelNotes ?? ""}

## Features this mission
${features.map((f) => `- ${f.name}: ${f.description}`).join("\n") || "- (none yet)"}

## Execute in order
`;

  let stepNum = 0;
  const steps: string[] = [];

  for (const f of features) {
    for (const step of f.assignedSteps) {
      stepNum += 1;
      const bot = state.bots.find((b) => b.id === step.botId);
      steps.push(
        workerBlock(stepNum, step.phase, f.name, step.summary, bot, project),
      );
    }
  }

  if (steps.length === 0) {
    steps.push(`### Step 1 — God Bot
${formatDocsRead(godBot)}
Jeff wants: ${intent.trim() || "continue project"}
${WORKER_RULES}
`);
  }

  const footer = `
## After each step
Reply exactly: STEP N DONE — [one line]

Jeff marks steps done in Jeff OS Easy Mode.
`;

  return boot + steps.join("\n") + footer;
}

export function flattenMissionSteps(project: Project) {
  const out: {
    key: string;
    featureId: string;
    phase: string;
    label: string;
    summary: string;
    status: string;
  }[] = [];

  for (const f of project.orchestration?.features ?? []) {
    for (const s of f.assignedSteps) {
      out.push({
        key: `${f.id}:${s.phase}`,
        featureId: f.id,
        phase: s.phase,
        label: `${botPhaseLabel(s.phase)} · ${f.name}`,
        summary: s.summary,
        status: s.status,
      });
    }
  }
  return out;
}
