import type { BotDefinition, MissionControlState, Project, PromptBuilderInput, PromptBuilderOutput } from "@/lib/types";
import { computeRouting } from "@/lib/routing/engine";
import { formatDocsRead, jeffOsDocsAbsolutePath } from "@/lib/jeff-os/branding";

function caveman(on: boolean, text: string): string {
  if (!on) return text;
  return text
    .replace(/Please /g, "")
    .replace(/you should /gi, "")
    .replace(/I would like you to /gi, "")
    .trim();
}

export function buildPromptPackets(
  input: PromptBuilderInput,
  state: MissionControlState,
): PromptBuilderOutput {
  const project = state.projects.find((p) => p.id === input.projectId);
  const settings = state.settings;

  const routing = computeRouting({
    taskType: input.taskType,
    taskSize: input.taskSize,
    optimizeFor: input.optimizeFor,
    autonomyLevel: input.autonomyLevel,
    riskLevel: input.riskLevel,
    costSensitivity: input.costSensitivity,
    project,
    settings,
    presets: state.routingPresets,
    bots: state.bots,
  });

  const bot = state.bots.find((b) => b.id === routing.botId);
  const cavemanMode = settings.cavemanDefault || project?.jeffMode === "caveman";

  const controlTowerPacket = caveman(
    cavemanMode,
    `${formatDocsRead("CONTROL_TOWER.md")}
${formatDocsRead("PROJECT_INDEX.md")}
Jeff wants: ${input.goal}
Project: ${project?.name ?? "TBD"}
Task type: ${input.taskType}
Optimize: ${input.optimizeFor}
Mode: ${cavemanMode ? "caveman" : "normal"}`,
  );

  const godBotPacket = caveman(
    cavemanMode,
    `Read ${jeffOsDocsAbsolutePath().replace(/\\/g, "/")}/projects/${project?.slug ?? "PROJECT"}.md
Also read repo README.md and AGENTS.md if exist.
Path: ${project?.path ?? "confirm path"}
Jeff wants: ${input.goal}
Constraints: ${input.constraints || "minimal diff, match repo conventions"}
Output: ${input.requestedOutput || "working code + verify steps"}
Mode: ${cavemanMode ? "caveman" : "normal"}`,
  );

  const workerPrompt = caveman(
    cavemanMode,
    `You are ${bot?.name ?? "Worker Bot"}. ${bot?.role ?? "Execute one scoped task."}

Rules:
- ${input.constraints || "Minimal diff. Match repo conventions."}
- Optimize for: ${input.optimizeFor}
- Risk: ${input.riskLevel} | Autonomy: ${input.autonomyLevel}
- Run build/test if project has them

Task: ${input.goal}
Project: ${project?.name ?? input.projectId}
Repo: ${project?.path ?? "confirm path"}
Interface: ${routing.interface} | Model class: ${routing.modelClass}
Mode: ${cavemanMode ? "caveman" : "normal"}`,
  );

  return { controlTowerPacket, godBotPacket, workerPrompt, routing };
}

export function quickLaunchPrompt(
  project: Project,
  bot: BotDefinition,
  kind: "control-tower" | "god-bot" | "worker",
): string {
  if (kind === "control-tower") {
    return `${formatDocsRead("CONTROL_TOWER.md")}
${formatDocsRead("PROJECT_INDEX.md")}
Focus project: ${project.name}
Mode: caveman`;
  }
  if (kind === "god-bot") {
    return `${formatDocsRead(`projects/${project.slug}.md`)}
Open path: ${project.path ?? "see PROJECT_INDEX"}
Jeff wants: [goal here]
Mode: caveman`;
  }
  return `${bot.promptPreview}

Project: ${project.name}
Path: ${project.path ?? "confirm"}
Mode: caveman`;
}
