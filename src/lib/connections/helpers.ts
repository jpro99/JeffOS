import type { Project, ProjectCostProfile, ProjectConnection } from "@/lib/types";
import { getConnectionsForProject } from "@/lib/connections/catalog";

export function buildCostProfile(connections: ProjectConnection[]): ProjectCostProfile {
  const lines = connections
    .filter((c) => c.estimatedMonthlyUsd > 0)
    .map((c) => ({
      connectionId: c.id,
      label: c.name,
      amountUsd: c.estimatedMonthlyUsd,
    }));

  const estimatedMonthlyUsd = connections.reduce((sum, c) => sum + c.estimatedMonthlyUsd, 0);

  return {
    estimatedMonthlyUsd,
    lines,
    lastUpdated: new Date().toISOString(),
  };
}

/** Attach catalog connections; preserve Jeff's manual cost edits */
export function attachConnections(project: Project): Project {
  const catalog = getConnectionsForProject(project.id);
  if (catalog.length === 0 && !project.connections?.length) {
    return project;
  }

  const existing = project.connections ?? [];
  const mergedConnections = catalog.length
    ? catalog.map((conn) => {
        const prev = existing.find((e) => e.id === conn.id && e.kind === conn.kind);
        if (prev?.billingSource === "manual") {
          return { ...conn, setupStatus: prev.setupStatus ?? conn.setupStatus };
        }
        if (prev?.setupStatus) return { ...conn, setupStatus: prev.setupStatus };
        return conn;
      })
    : existing;

  const hasManualCost = project.costProfile?.lines.some((l) => l.amountUsd !== undefined);
  const costProfile =
    project.costProfile && hasManualCost
      ? {
          ...project.costProfile,
          estimatedMonthlyUsd: project.costProfile.lines.reduce((s, l) => s + l.amountUsd, 0),
        }
      : buildCostProfile(mergedConnections);

  return {
    ...project,
    github: project.github ?? mergedConnections.find((c) => c.kind === "github")?.url,
    connections: mergedConnections,
    costProfile,
  };
}

export function sumProjectCost(project: Project): number {
  if (project.costProfile?.estimatedMonthlyUsd != null) {
    return project.costProfile.estimatedMonthlyUsd;
  }
  return (project.connections ?? []).reduce((s, c) => s + c.estimatedMonthlyUsd, 0);
}

export type CostAlertLevel = "ok" | "warn" | "danger";

export function getCostAlertLevel(
  amountUsd: number,
  thresholdUsd: number,
  warningPercent: number,
): CostAlertLevel {
  if (amountUsd >= thresholdUsd) return "danger";
  if (amountUsd >= thresholdUsd * (warningPercent / 100)) return "warn";
  return "ok";
}

export function costAlertClasses(level: CostAlertLevel): string {
  if (level === "danger") return "border-rose-500/40 bg-rose-500/15 text-rose-200";
  if (level === "warn") return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  return "border-teal-500/25 bg-teal-500/10 text-teal-200";
}
