import type { Project } from "@/lib/types";
import { seedState } from "@/lib/seed/data";
import { attachOps } from "@/lib/seed/project-ops";
import { attachConnections } from "@/lib/connections/helpers";
import { attachOrchestration } from "@/lib/orchestration/defaults";
import {
  PROJECT_CATALOG,
  normalizePath,
  type CatalogEntry,
} from "@/lib/discovery/catalog";
import type { DiscoveredFolder, DiscoveryScanResult } from "@/lib/discovery/scanner";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function catalogToProject(entry: CatalogEntry, diskPath: string, pathExists: boolean): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    type: entry.type,
    stack: entry.stack,
    status: entry.status,
    priority: entry.priority,
    path: diskPath || entry.path || undefined,
    github: entry.github,
    description: entry.description,
    goals: entry.goals,
    risks: entry.risks,
    roadmap: entry.roadmap,
    assignedGodBotId: entry.assignedGodBotId,
    workerBotIds: entry.workerBotIds,
    preferredInterface: entry.preferredInterface,
    preferredModelClass: entry.preferredModelClass,
    activeBotStrategy: entry.activeBotStrategy,
    godBotFile: entry.godBotFile ?? `projects/${entry.slug}.md`,
    jeffMode: "caveman",
    lastUpdated: now,
    discoverySource: "catalog",
    pathExists,
    discoveredAt: now,
    ops: attachOps({ id: entry.id, name: entry.name }).ops,
  };
  return attachOrchestration(attachConnections(project));
}

function unknownToProject(folder: DiscoveredFolder): Project {
  const now = new Date().toISOString();
  const slug = slugFromName(folder.name);
  const id = `proj-disc-${slug}`;
  const project: Project = {
    id,
    name: folder.name,
    slug,
    type: "Discovered",
    stack: folder.hasSln ? [".NET"] : folder.hasPackageJson ? ["Node"] : ["Unknown"],
    status: "prototype",
    priority: "P3",
    path: folder.path,
    description: `Auto-discovered from ${folder.path}`,
    goals: ["Review and add to catalog"],
    risks: ["Unknown scope"],
    roadmap: ["Jeff triage"],
    assignedGodBotId: "bot-control-tower",
    workerBotIds: ["bot-spec"],
    preferredInterface: "cursor",
    preferredModelClass: "balanced",
    activeBotStrategy: "Control Tower triage",
    jeffMode: "caveman",
    lastUpdated: folder.modifiedAt ?? now,
    discoverySource: "scan",
    pathExists: true,
    discoveredAt: now,
    ops: attachOps({ id, name: folder.name }).ops,
  };
  return attachOrchestration(attachConnections(project));
}

function mergeProject(existing: Project, incoming: Project): Project {
  const keepOps =
    existing.ops &&
    !existing.ops.plainSummary.includes("ops data pending scan") &&
    !existing.ops.plainSummary.includes("Auto-discovered");

  const merged = {
    ...existing,
    ...incoming,
    id: existing.id,
    name: existing.discoverySource === "manual" ? existing.name : incoming.name,
    ops: keepOps ? existing.ops : incoming.ops,
    goals: existing.goals.length > 2 ? existing.goals : incoming.goals,
    risks: existing.risks.length ? existing.risks : incoming.risks,
    roadmap: existing.roadmap.length ? existing.roadmap : incoming.roadmap,
    pathExists: incoming.pathExists,
    lastUpdated: incoming.lastUpdated,
    connections: existing.connections?.some((c) => c.billingSource === "manual")
      ? existing.connections
      : incoming.connections,
    costProfile: existing.costProfile?.lines.some((l) =>
      existing.connections?.find((c) => c.id === l.connectionId)?.billingSource === "manual",
    )
      ? existing.costProfile
      : incoming.costProfile,
  };
  return attachOrchestration(attachConnections(merged));
}

function findExistingByPath(projects: Project[], diskPath: string): Project | undefined {
  const norm = normalizePath(diskPath);
  return projects.find((p) => p.path && normalizePath(p.path) === norm);
}

export function buildProjectsFromScan(
  scan: DiscoveryScanResult,
  existingProjects: Project[],
  includeUnknown = true,
): { projects: Project[]; added: number; updated: number } {
  const byId = new Map<string, Project>();
  let added = 0;
  let updated = 0;

  for (const entry of PROJECT_CATALOG) {
    if (entry.skip) continue;

    const folder = scan.folders.find(
      (f) => f.catalogId === entry.id || (entry.path && normalizePath(f.path) === normalizePath(entry.path)),
    );

    const diskPath = folder?.path ?? entry.path;
    const pathExists = Boolean(folder?.exists);

    if (!diskPath && !folder) {
      const existing = existingProjects.find((p) => p.id === entry.id);
      if (existing) {
        byId.set(entry.id, existing);
      } else {
        byId.set(entry.id, catalogToProject(entry, "", false));
        added++;
      }
      continue;
    }

    if (!folder && entry.path && !pathExists) {
      const existing = existingProjects.find((p) => p.id === entry.id);
      const proj = catalogToProject(entry, entry.path, false);
      byId.set(entry.id, existing ? mergeProject(existing, { ...proj, pathExists: false }) : proj);
      if (!existing) added++;
      continue;
    }

    const incoming = catalogToProject(entry, diskPath, pathExists);
    const existing =
      existingProjects.find((p) => p.id === entry.id) ?? (diskPath ? findExistingByPath(existingProjects, diskPath) : undefined);

    if (existing) {
      byId.set(entry.id, mergeProject(existing, incoming));
      updated++;
    } else {
      byId.set(entry.id, incoming);
      added++;
    }
  }

  if (includeUnknown) {
    for (const folder of scan.unknownFolders) {
      const existing = findExistingByPath(existingProjects, folder.path);
      if (existing) {
        byId.set(existing.id, mergeProject(existing, unknownToProject(folder)));
        updated++;
      } else {
        const proj = unknownToProject(folder);
        byId.set(proj.id, proj);
        added++;
      }
    }
  }

  for (const p of existingProjects) {
    if (byId.has(p.id)) continue;
    if (p.discoverySource === "manual" || p.id === "proj-new-idea") {
      byId.set(p.id, p);
    }
  }

  if (!byId.has("proj-new-idea")) {
    const seed = existingProjects.find((p) => p.id === "proj-new-idea");
    if (seed) byId.set(seed.id, seed);
  }

  if (!byId.has("proj-jeff-os")) {
    const seed =
      existingProjects.find((p) => p.id === "proj-jeff-os") ??
      seedState.projects.find((p) => p.id === "proj-jeff-os");
    if (seed) byId.set("proj-jeff-os", seed);
  }

  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const projects = [...byId.values()].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 9;
    const pb = priorityOrder[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });

  return { projects, added, updated };
}
