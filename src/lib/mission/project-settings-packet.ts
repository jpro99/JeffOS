import type { Project, ProjectScope } from "@/lib/types";
import { ensureOrchestration } from "@/lib/orchestration/defaults";

export interface ProjectSettingsPacket {
  version: 1;
  sourceName: string;
  description: string;
  goals: string[];
  risks: string[];
  roadmap: string[];
  assignedGodBotId: string;
  workerBotIds: string[];
  activeBotStrategy: string;
  preferredInterface: Project["preferredInterface"];
  preferredModelClass: Project["preferredModelClass"];
  jeffMode: Project["jeffMode"];
  godBotFile?: string;
  scope: ProjectScope;
}

export function extractSettingsPacket(project: Project): ProjectSettingsPacket {
  const orch = ensureOrchestration(project);
  return {
    version: 1,
    sourceName: project.name,
    description: project.description,
    goals: [...project.goals],
    risks: [...project.risks],
    roadmap: [...project.roadmap],
    assignedGodBotId: project.assignedGodBotId,
    workerBotIds: [...project.workerBotIds],
    activeBotStrategy: project.activeBotStrategy,
    preferredInterface: project.preferredInterface,
    preferredModelClass: project.preferredModelClass,
    jeffMode: project.jeffMode,
    godBotFile: project.godBotFile,
    scope: { ...orch.scope },
  };
}

export function applySettingsPacket(project: Project, packet: ProjectSettingsPacket): Project {
  const orch = ensureOrchestration(project);
  return {
    ...project,
    description: packet.description,
    goals: [...packet.goals],
    risks: [...packet.risks],
    roadmap: [...packet.roadmap],
    assignedGodBotId: packet.assignedGodBotId,
    workerBotIds: [...packet.workerBotIds],
    activeBotStrategy: packet.activeBotStrategy,
    preferredInterface: packet.preferredInterface,
    preferredModelClass: packet.preferredModelClass,
    jeffMode: packet.jeffMode,
    godBotFile: packet.godBotFile,
    orchestration: {
      ...orch,
      scope: { ...packet.scope, updatedAt: new Date().toISOString() },
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function copySettingsToProject(from: Project, to: Project): Project {
  return applySettingsPacket(to, extractSettingsPacket(from));
}
