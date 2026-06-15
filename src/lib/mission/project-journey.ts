import type { Project } from "@/lib/types";
import { sanitizeFolderName } from "@/lib/mission/project-location";

export type JourneyPhase = "plan" | "folder" | "connect" | "build" | "fix" | "ship" | "done";

export const JOURNEY_STEPS: { id: JourneyPhase; label: string; verb: string }[] = [
  { id: "plan", label: "Plan", verb: "Go" },
  { id: "folder", label: "Folder", verb: "Create folder" },
  { id: "connect", label: "Connect", verb: "Connect" },
  { id: "build", label: "Build", verb: "Build in Cursor" },
  { id: "fix", label: "Fix", verb: "Fix next" },
  { id: "ship", label: "Ship", verb: "Push live" },
  { id: "done", label: "Done", verb: "Finish" },
];

export function suggestNameFromPitch(pitch: string): string {
  const words = pitch
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (words.length === 0) return "New App";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export function computeJourneyPhase(project: Project): JourneyPhase {
  const orch = project.orchestration;
  const hasPlan = Boolean(orch?.plan?.approved || project.ops.commandSession?.lastPrompt);
  const hasPath = Boolean(project.path?.trim());
  const onDisk = project.pathExists !== false && hasPath;
  const hasGithub = project.connections?.some(
    (c) => c.kind === "github" && c.setupStatus === "connected",
  );
  const openErrors = project.ops.errors.filter((e) => !e.resolved);
  const verified =
    project.ops.liveVerify?.canAdvance === true ||
    project.ops.errorFixMission?.lastVerifyPassed === true;

  if (!hasPath || !onDisk) return "folder";
  if (!hasPlan) return "build";
  if (openErrors.length > 0 || project.ops.blockers.length > 0 || !verified) return "fix";
  if (!hasGithub && project.ops.readinessLevel === "idea") return "connect";
  if (
    project.ops.readinessLevel === "usable" ||
    project.ops.readinessLevel === "production-ready" ||
    project.ops.readinessLevel === "beta"
  ) {
    return verified ? "done" : "ship";
  }
  return "ship";
}

export function journeyPhaseIndex(phase: JourneyPhase): number {
  return JOURNEY_STEPS.findIndex((s) => s.id === phase);
}

export function journeyHeadline(phase: JourneyPhase, project: Project): string {
  switch (phase) {
    case "plan":
      return "What are we building?";
    case "folder":
      return "We need a folder on your PC";
    case "connect":
      return "Connect Git, Vercel, and Cursor";
    case "build":
      return "Paste the build prompt in Cursor";
    case "fix":
      return openIssueSummary(project);
    case "ship":
      return "Push to GitHub — Vercel follows";
    case "done":
      return "Project is in good shape — add ideas below or ship tweaks";
  }
}

export function openIssueSummary(project: Project): string {
  const open = project.ops.errors.filter((e) => !e.resolved);
  if (open.length === 0 && project.ops.blockers.length === 0) {
    return "Run a build to find anything broken";
  }
  if (open.length === 1) return `Fix: ${open[0].title}`;
  if (open.length > 1) return `${open.length} issues to fix — tap Fix next`;
  return `Blocked: ${project.ops.blockers[0]}`;
}

export function defaultFolderName(project: Project): string {
  return sanitizeFolderName(project.name);
}
