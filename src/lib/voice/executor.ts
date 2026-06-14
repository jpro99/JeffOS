import type { MissionControlState, RoutingDecision, VoiceCommandInterpretation } from "@/lib/types";
import { resolveQuickCommand } from "@/lib/intelligence/commands";
import { computeRouting } from "@/lib/routing/engine";

export interface VoiceExecutionResult {
  success: boolean;
  message: string;
  spokenResponse: string;
  prompt?: string;
  navigateTo?: string;
  routing?: RoutingDecision;
  projectId?: string;
}

export function executeVoiceCommand(
  interpretation: VoiceCommandInterpretation,
  state: MissionControlState,
): VoiceExecutionResult {
  const project = interpretation.targetProjectId
    ? state.projects.find((p) => p.id === interpretation.targetProjectId)
    : state.projects.find((p) => p.id === state.workspace.activeProjectId);

  if (interpretation.targetAction === "navigate-home") {
    return { success: true, message: "Opening home", spokenResponse: "Opening home.", navigateTo: "/" };
  }
  if (interpretation.targetAction === "navigate-tasks") {
    return { success: true, message: "Opening tasks", spokenResponse: "Opening tasks.", navigateTo: "/tasks" };
  }
  if (interpretation.targetAction === "navigate-bots") {
    return { success: true, message: "Opening bots", spokenResponse: "Opening bots.", navigateTo: "/bots" };
  }

  if (!project) {
    return {
      success: false,
      message: "No project matched. Pick a project or say its name.",
      spokenResponse: "Could not find that project.",
    };
  }

  if (interpretation.statusLookup === "readiness") {
    return {
      success: true,
      message: `${project.name}: ${project.ops.readinessScore}% ready — ${project.ops.readinessLevel.replace(/-/g, " ")}`,
      spokenResponse: interpretation.spokenResponse ?? `${project.name} readiness loaded.`,
      navigateTo: `/projects/${project.id}`,
    };
  }

  if (interpretation.statusLookup === "blockers") {
    const blockers = project.ops.blockers.length
      ? project.ops.blockers.join("; ")
      : "No blockers listed.";
    return {
      success: true,
      message: `Blockers: ${blockers}`,
      spokenResponse: interpretation.spokenResponse ?? "Blockers loaded.",
      navigateTo: `/projects/${project.id}`,
      projectId: project.id,
    };
  }

  if (interpretation.targetAction === "open-project" || interpretation.targetAction === "focus-project") {
    if (!interpretation.quickCommandId) {
      return {
        success: true,
        message: `Opened ${project.name}`,
        spokenResponse: interpretation.spokenResponse ?? `Opening ${project.name}.`,
        navigateTo: `/projects/${project.id}`,
        projectId: project.id,
      };
    }
  }

  if (interpretation.routingPreference) {
    const optimizeFor = interpretation.routingPreference === "cheapest" ? "cost" : "quality";
    const modelClass = interpretation.routingPreference === "cheapest" ? "cheap-fast" : "deep-reasoning";
    const routing = computeRouting({
      taskType: project.ops.nextAction.taskType,
      taskSize: "medium",
      optimizeFor,
      autonomyLevel: "medium",
      riskLevel: project.ops.riskLevel,
      costSensitivity: interpretation.routingPreference === "cheapest" ? "high" : "low",
      project,
      settings: state.settings,
      presets: state.routingPresets,
      bots: state.bots,
    });
    routing.modelClass = modelClass;
    return {
      success: true,
      message: `Route set — ${interpretation.routingPreference} path via ${routing.interface}`,
      spokenResponse:
        interpretation.routingPreference === "cheapest"
          ? "Cheapest path ready."
          : "Strongest path ready.",
      navigateTo: `/projects/${project.id}`,
      routing,
      projectId: project.id,
    };
  }

  if (interpretation.quickCommandId) {
    const result = resolveQuickCommand(interpretation.quickCommandId, project, state);
    return {
      success: true,
      message: `${result.label} ready for ${project.name}`,
      spokenResponse: interpretation.spokenResponse ?? "Next recommended action ready.",
      prompt: result.prompt,
      navigateTo: `/projects/${project.id}`,
      routing: result.routing,
      projectId: project.id,
    };
  }

  return {
    success: false,
    message: "Could not interpret command. Try again or edit transcript.",
    spokenResponse: "Command not understood.",
  };
}
