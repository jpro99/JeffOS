import type {
  MissionControlState,
  Project,
  ProjectOps,
  QuickCommandId,
  RoutingDecision,
} from "@/lib/types";
import { computeRouting } from "@/lib/routing/engine";
import { buildPromptPackets } from "@/lib/routing/prompts";
import { quickLaunchPrompt } from "@/lib/routing/prompts";

export interface QuickCommandResult {
  label: string;
  prompt: string;
  routing: RoutingDecision;
  plainEnglish: string;
}

const COMMAND_LABELS: Record<QuickCommandId, string> = {
  "continue-coding": "Continue Coding",
  "fix-errors": "Fix Errors",
  "next-step": "Next Step",
  "god-mode": "God Mode",
  "build-fast": "Build Fast",
  "review-security": "Review Security",
  "audit-readiness": "Audit Readiness",
  "generate-prompt": "Generate Best Prompt",
  "route-task": "Route This Task",
  "what-to-do": "Show Me What To Do",
  "ultimate-mode": "Ultimate Mode",
  "continue-build": "Continue Build",
  "fix-next-issue": "Fix Next Issue",
  "review-errors": "Review Errors",
  "strengthen-security": "Strengthen Security",
  "prepare-launch": "Prepare for Launch",
};

export function getCommandLabel(id: QuickCommandId): string {
  return COMMAND_LABELS[id];
}

export const QUICK_COMMANDS: QuickCommandId[] = [
  "what-to-do",
  "continue-build",
  "fix-next-issue",
  "next-step",
  "continue-coding",
  "fix-errors",
  "generate-prompt",
  "route-task",
  "review-security",
  "strengthen-security",
  "audit-readiness",
  "prepare-launch",
  "god-mode",
  "ultimate-mode",
  "build-fast",
];

export function resolveQuickCommand(
  commandId: QuickCommandId,
  project: Project,
  state: MissionControlState,
): QuickCommandResult {
  const ops = project.ops;
  const godBot = state.bots.find((b) => b.id === project.assignedGodBotId);

  let taskType = ops.nextAction.taskType;
  let goal = ops.nextAction.title;
  let plainEnglish = ops.nextAction.whyItMatters;

  switch (commandId) {
    case "fix-errors":
    case "fix-next-issue":
    case "review-errors":
      taskType = ops.errors[0]?.taskType ?? "bugfix";
      goal = ops.errors[0]?.recommendedFix ?? "Review and fix top error";
      plainEnglish = ops.errors[0]?.whyDoingIt ?? "Clear blockers first";
      break;
    case "review-security":
    case "strengthen-security":
      taskType = "security";
      goal = "Security hardening pass — auth, uploads, secrets";
      plainEnglish = "Legal/sensitive apps need this before launch";
      break;
    case "audit-readiness":
    case "prepare-launch":
      taskType = "audit";
      goal = `Audit readiness — currently ${ops.readinessLevel}, launch confidence ${ops.launchConfidence}%`;
      plainEnglish = "Know gap before demo or prod";
      break;
    case "god-mode":
    case "ultimate-mode":
      taskType = "exploration";
      goal = ops.godModeIdeas[0]?.insight ?? "God Mode strategy session";
      plainEnglish = ops.godModeIdeas[0]?.question ?? "Think bigger";
      break;
    case "what-to-do":
    case "next-step":
    case "continue-build":
    case "continue-coding":
    case "build-fast":
      taskType = ops.nextAction.taskType;
      goal = ops.nextAction.title;
      plainEnglish = ops.nextAction.whyItMatters;
      break;
    case "generate-prompt":
      taskType = ops.nextAction.taskType;
      goal = ops.nextAction.recommendedPrompt;
      plainEnglish = "Copy-ready prompt for next move";
      break;
    case "route-task":
      taskType = ops.nextAction.taskType;
      goal = ops.nextAction.title;
      plainEnglish = "Route only — pick best interface/bot/model";
      break;
  }

  const routing = computeRouting({
    taskType,
    taskSize: commandId === "build-fast" ? "small" : "medium",
    optimizeFor: commandId === "build-fast" ? "speed" : "quality",
    autonomyLevel: commandId === "build-fast" ? "low" : "medium",
    riskLevel: ops.riskLevel,
    costSensitivity: state.settings.costSaveMode ? "high" : "medium",
    project,
    settings: state.settings,
    presets: state.routingPresets,
    bots: state.bots,
  });

  let prompt: string;
  if (commandId === "generate-prompt" || commandId === "route-task") {
    const packets = buildPromptPackets(
      {
        projectId: project.id,
        taskType,
        goal,
        constraints: "Minimal diff. Match repo. Caveman mode.",
        optimizeFor: "quality",
        autonomyLevel: "medium",
        riskLevel: ops.riskLevel,
        costSensitivity: "medium",
        taskSize: "medium",
        requestedOutput: "Working result + verify steps",
      },
      state,
    );
    prompt = packets.workerPrompt;
  } else if (commandId === "god-mode" || commandId === "ultimate-mode") {
    prompt = `God Mode session for ${project.name}

Question: ${ops.godModeIdeas.map((g) => g.question).join("\n")}

Focus insight: ${ops.godModeIdeas[0]?.insight ?? ""}

Jeff wants: breakthrough strategy, not code yet.
Mode: caveman.`;
  } else if (godBot) {
    prompt = `${quickLaunchPrompt(project, godBot, "god-bot")}

Task: ${goal}
Route: ${routing.interface} / ${routing.modelClass}
Mode: caveman`;
  } else {
    prompt = ops.nextAction.recommendedPrompt;
  }

  return {
    label: COMMAND_LABELS[commandId],
    prompt,
    routing,
    plainEnglish,
  };
}

export function readinessColor(level: ProjectOps["readinessLevel"]): string {
  const map: Record<string, string> = {
    idea: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    scaffolded: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    building: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    "partially-working": "text-teal-400 bg-teal-500/10 border-teal-500/20",
    usable: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    beta: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    "production-ready": "text-green-400 bg-green-500/10 border-green-500/20",
    "needs-repair": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  return map[level] ?? map.building;
}

export function healthBarColor(status: "good" | "warn" | "bad"): string {
  if (status === "good") return "bg-teal-500";
  if (status === "warn") return "bg-amber-500";
  return "bg-rose-500";
}
