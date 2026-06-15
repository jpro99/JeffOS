import type { Project } from "@/lib/types";
import {
  JOURNEY_STEPS,
  computeJourneyPhase,
  type JourneyPhase,
} from "@/lib/mission/project-journey";

export interface ProjectQuickStatus {
  phase: JourneyPhase;
  phaseLabel: string;
  errorCount: number;
  blockerCount: number;
  nextTitle: string;
  summary: string;
  tone: "rose" | "amber" | "teal" | "indigo" | "emerald" | "zinc";
}

const TONE_BY_PHASE: Record<JourneyPhase, ProjectQuickStatus["tone"]> = {
  plan: "zinc",
  folder: "amber",
  connect: "indigo",
  build: "teal",
  fix: "rose",
  ship: "indigo",
  done: "emerald",
};

export function getProjectQuickStatus(project: Project): ProjectQuickStatus {
  const phase = computeJourneyPhase(project);
  const phaseLabel = JOURNEY_STEPS.find((s) => s.id === phase)?.label ?? phase;
  const errorCount = project.ops.errors.filter((e) => !e.resolved).length;
  const blockerCount = project.ops.blockers.length;
  const nextTitle = project.ops.nextAction.title;

  let summary = `${phaseLabel}`;
  if (errorCount > 0) summary = `${phaseLabel} · ${errorCount} err`;
  else if (blockerCount > 0) summary = `${phaseLabel} · blocked`;
  else if (phase === "done") summary = "Done ✓";

  return {
    phase,
    phaseLabel,
    errorCount,
    blockerCount,
    nextTitle,
    summary,
    tone: TONE_BY_PHASE[phase],
  };
}

/** Sort for command strip: pinned → priority → name */
export function sortProjectsForCommandStrip(
  projects: Project[],
  pinnedIds: string[],
): Project[] {
  const po: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return [...projects].sort((a, b) => {
    const ap = pinnedIds.includes(a.id) ? 0 : 1;
    const bp = pinnedIds.includes(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    const prio = (po[a.priority] ?? 9) - (po[b.priority] ?? 9);
    if (prio !== 0) return prio;
    return a.name.localeCompare(b.name);
  });
}

export function projectTabLabel(project: Project, max = 14): string {
  const name = project.name.trim();
  if (name.length <= max) return name;
  const first = name.split(/\s+/)[0];
  return first.length <= max ? first : `${name.slice(0, max - 1)}…`;
}
