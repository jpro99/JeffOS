import type { FolderScan } from "@/lib/project-scan/analyze";
import { buildConnectionInventory } from "@/lib/connections/inventory";
import { collectLiveGaps } from "@/lib/project-scan/reconcile";
import type { Project, ProjectFeature } from "@/lib/types";

export type OperationalStatus = "operational" | "partial" | "building" | "not-built" | "blocked";

export interface ProjectBrief {
  scannedAt: string;
  oneLiner: string;
  operational: {
    status: OperationalStatus;
    label: string;
    readiness: string;
    percentComplete: number;
  };
  scope: {
    pitch: string;
    description: string;
    goals: string[];
    directions: string[];
  };
  built: string[];
  notBuilt: string[];
  needsBuild: string[];
  connected: { name: string; detail: string; ok: boolean }[];
  stillNeed: string[];
  workingWell: string[];
  wouldNotRepeat: string[];
  features: {
    done: string[];
    inProgress: string[];
    planned: string[];
  };
  /** Honest gaps from disk + verify — not stale seed notes */
  liveGaps: { id: string; title: string; category: string; detail: string; source: string }[];
  liveGapCount: number;
}

function featureBucket(f: ProjectFeature): "done" | "inProgress" | "planned" {
  if (f.status === "done") return "done";
  if (["building", "testing", "security-review", "planning"].includes(f.status)) return "inProgress";
  return "planned";
}

function operationalFromProject(
  project: Project,
  scan: FolderScan,
  liveGapCount: number,
): ProjectBrief["operational"] {
  const ops = project.ops;
  let status: OperationalStatus = "partial";

  if (ops.blockers.length > 0 || ops.errors.some((e) => !e.resolved)) {
    status = "blocked";
  } else if (ops.liveVerify?.canAdvance && liveGapCount === 0) {
    status = "operational";
  } else if (ops.readinessLevel === "production-ready" || ops.readinessLevel === "beta") {
    status = liveGapCount === 0 ? "operational" : "partial";
  } else if (ops.readinessLevel === "idea" || ops.readinessLevel === "scaffolded") {
    status = "not-built";
  } else if (project.orchestration?.planningStatus === "building") {
    status = "building";
  } else if (!scan.exists || (!scan.hasPackageJson && !scan.signals.some((s) => s.includes(".NET")))) {
    status = "not-built";
  } else if (liveGapCount === 0 && ops.liveVerify?.buildPassed) {
    status = "operational";
  }

  const labels: Record<OperationalStatus, string> = {
    operational: "Operational — usable shape on disk",
    partial: "Partially working — core exists, gaps remain",
    building: "Build in progress — mission active",
    "not-built": "Not built yet — idea or empty folder",
    blocked: "Blocked — fix errors before shipping",
  };

  return {
    status,
    label: labels[status],
    readiness: ops.readinessLevel.replace(/-/g, " "),
    percentComplete: ops.percentComplete,
  };
}

export function buildProjectBrief(
  project: Project,
  scan: FolderScan,
  godBot?: { purpose: string; goals: string[]; gotchas: string[] },
): ProjectBrief {
  const ops = project.ops;
  const orch = project.orchestration;
  const features = orch?.features ?? [];

  const directions: string[] = [];
  if (orch?.scope.pitch) directions.push(`Pitch: ${orch.scope.pitch}`);
  if (godBot?.purpose) directions.push(`God Bot purpose: ${godBot.purpose}`);
  if (project.activeBotStrategy) directions.push(`Bot plan: ${project.activeBotStrategy}`);
  if (ops.nextAction?.title) directions.push(`Last direction: ${ops.nextAction.title}`);

  const built = [...new Set([...ops.working])];
  if (scan.hasAppRouter) built.push("App codebase (src/app)");
  if (scan.hasTests) built.push("Test suite on disk");
  if (scan.hasGit) built.push("Version control (git)");
  for (const f of features.filter((x) => x.status === "done")) built.push(`Feature done: ${f.name}`);

  const notBuilt = [...new Set([...ops.missingPieces])];
  for (const f of features.filter((x) => ["idea", "not-built"].includes(x.status))) {
    notBuilt.push(`Feature not started: ${f.name}`);
  }
  if (!scan.exists) notBuilt.push("Project folder missing on this machine");
  if (scan.exists && !scan.hasPackageJson && !scan.signals.some((s) => s.includes(".NET"))) {
    notBuilt.push("No runnable app scaffold detected");
  }

  const needsBuild = [...ops.whatsNext, ...ops.blockers];
  for (const f of features.filter((x) => ["building", "planning", "testing", "security-review"].includes(x.status))) {
    needsBuild.push(`${f.status}: ${f.name}`);
  }
  for (const step of ops.hardeningSteps) needsBuild.push(step);

  const inventory = buildConnectionInventory(project, scan);
  const liveGaps = collectLiveGaps(project, scan, inventory, project.ops.liveVerify);
  const liveGapCount = liveGaps.length;

  const connected: ProjectBrief["connected"] = [];
  for (const item of inventory) {
    connected.push({
      name: item.name,
      detail: item.statusLabel,
      ok: item.status === "connected",
    });
  }

  const stillNeed = liveGaps.map((g) => g.title).slice(0, 12);

  const workingWell = [...new Set([...ops.working, ...(godBot?.goals ?? [])])].slice(0, 10);

  const wouldNotRepeat = [
    ...project.risks,
    ...ops.blockers,
    ...(godBot?.gotchas ?? []),
    ...(orch?.retrospective?.wouldNotRepeat ?? []),
  ].filter(Boolean).slice(0, 10);

  const featureNames = {
    done: features.filter((f) => featureBucket(f) === "done").map((f) => f.name),
    inProgress: features.filter((f) => featureBucket(f) === "inProgress").map((f) => f.name),
    planned: features.filter((f) => featureBucket(f) === "planned").map((f) => f.name),
  };

  const operational = operationalFromProject(project, scan, liveGapCount);
  const pitch = orch?.scope.pitch || ops.plainSummary;

  const oneLiner = [
    `${project.name} — ${operational.readiness} (${operational.percentComplete}%).`,
    built.length ? `Built: ${built.slice(0, 3).join(", ")}${built.length > 3 ? "…" : ""}.` : "Little built yet.",
    stillNeed.length ? `Still need: ${stillNeed.slice(0, 2).join(", ")}${stillNeed.length > 2 ? "…" : ""}.` : "",
    "Say what you want next below.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    scannedAt: scan.scannedAt,
    oneLiner,
    operational,
    scope: {
      pitch,
      description: project.description,
      goals: project.goals.length ? project.goals : (godBot?.goals ?? []),
      directions,
    },
    built: built.slice(0, 15),
    notBuilt: notBuilt.slice(0, 15),
    needsBuild: [...new Set(needsBuild)].slice(0, 12),
    connected,
    stillNeed,
    workingWell,
    wouldNotRepeat,
    features: featureNames,
    liveGaps,
    liveGapCount,
  };
}
