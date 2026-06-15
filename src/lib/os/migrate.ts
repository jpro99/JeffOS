import { seedState } from "@/lib/seed/data";
import { uid } from "@/lib/utils";
import { attachOps, PROJECT_OPS } from "@/lib/seed/project-ops";
import { attachConnections } from "@/lib/connections/helpers";
import { attachOrchestration } from "@/lib/orchestration/defaults";
import { enrichProjectGodBotFile } from "@/lib/command-center/doc-paths";
import type { ActivityEntry, BotDefinition, MissionControlState, Project, WorkspaceState } from "@/lib/types";

function dedupeActivityIds(activity: ActivityEntry[]): ActivityEntry[] {
  const seen = new Set<string>();
  return activity.map((entry) => {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      return entry;
    }
    const next = { ...entry, id: uid("act") };
    seen.add(next.id);
    return next;
  });
}

const defaultWorkspace = (): WorkspaceState => ({
  activeProjectId: seedState.projects[0]?.id ?? null,
  activeTaskId: null,
  recentProjectIds: seedState.projects.slice(0, 4).map((p) => p.id),
  queueTaskIds: seedState.tasks.filter((t) => t.status !== "done").map((t) => t.id),
  activeRoute: seedState.workspace?.activeRoute ?? null,
  routeMode: "auto",
  pinnedProjectIds: ["proj-demand-generator", "proj-tripflow"],
  openWorkspaceIds: ["proj-demand-generator"],
  minimizedProjectIds: [],
  handoffNote: "",
  voice: {
    lastVoiceCommand: null,
    micPermissionState: "unknown",
  },
});

const KEPI_TRAVEL_PATH = "C:\\Projects\\Kepi Travel\\kepi-travel";

function enrichProject(project: Project): Project {
  const withOps = project.ops ? project : attachOps(project);
  return attachOrchestration(attachConnections(enrichProjectGodBotFile(withOps)));
}

export function ensureJeffOs(
  projects: Project[],
  bots: BotDefinition[],
): { projects: Project[]; bots: BotDefinition[] } {
  let nextProjects = projects;
  let nextBots = bots;

  if (!projects.some((p) => p.id === "proj-jeff-os")) {
    const seed = seedState.projects.find((p) => p.id === "proj-jeff-os");
    if (seed) nextProjects = [enrichProject(seed), ...projects];
  }

  if (!bots.some((b) => b.id === "bot-god-jeff-os")) {
    const seedBot = seedState.bots.find((b) => b.id === "bot-god-jeff-os");
    if (seedBot) nextBots = [seedBot, ...bots];
  }

  return { projects: nextProjects, bots: nextBots };
}

function isLegacyBloatedPrompt(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  return (
    text.includes("COMMAND SESSION") ||
    text.includes("MASTER ORCHESTRATOR") ||
    text.includes("STEP 24") ||
    text.includes("Session bots: 6 roles · 24 steps")
  );
}

function stripLegacyBloatedPrompts(projects: Project[]): Project[] {
  return projects.map((p) => {
    const cs = p.ops.commandSession;
    const efm = p.ops.errorFixMission;
    let ops = p.ops;

    if (cs?.lastPrompt && isLegacyBloatedPrompt(cs.lastPrompt)) {
      ops = {
        ...ops,
        commandSession: { ...cs, lastPrompt: "" },
      };
    }
    if (efm?.lastPrompt && isLegacyBloatedPrompt(efm.lastPrompt)) {
      ops = {
        ...ops,
        errorFixMission: { ...efm, lastPrompt: "" },
      };
    }
    return ops === p.ops ? p : { ...p, ops };
  });
}

function mergeSeedGodModeIdeas(projects: Project[]): Project[] {
  return projects.map((p) => {
    const seedOps = PROJECT_OPS[p.id];
    if (!seedOps?.godModeIdeas?.length) return p;
    const existing = new Set(p.ops.godModeIdeas.map((g) => g.id));
    const merged = [...p.ops.godModeIdeas];
    for (const idea of seedOps.godModeIdeas) {
      if (!existing.has(idea.id)) merged.push(idea);
    }
    return merged.length === p.ops.godModeIdeas.length ? p : { ...p, ops: { ...p.ops, godModeIdeas: merged } };
  });
}

/** Merge persisted state with current schema */
export function migrateState(raw: Partial<MissionControlState>): MissionControlState {
  const base = { ...seedState, ...raw };
  let projects = (base.projects?.length ? base.projects : seedState.projects).map((p) => {
    let project = p;
    if (
      p.id === "proj-tripflow" &&
      project.path?.toLowerCase().includes("kepi-travel-reborn")
    ) {
      project = { ...project, path: KEPI_TRAVEL_PATH };
    }
    return enrichProject(project);
  });

  let bots = base.bots?.length ? base.bots : seedState.bots;
  ({ projects, bots } = ensureJeffOs(projects, bots));
  projects = stripLegacyBloatedPrompts(projects);
  projects = mergeSeedGodModeIdeas(projects);

  return {
    ...seedState,
    ...base,
    settings: {
      ...seedState.settings,
      ...base.settings,
      voiceEnabled: base.settings?.voiceEnabled ?? seedState.settings.voiceEnabled,
      voiceMode: base.settings?.voiceMode ?? seedState.settings.voiceMode,
      voiceResponseEnabled: base.settings?.voiceResponseEnabled ?? seedState.settings.voiceResponseEnabled,
      autoDiscoverProjects: base.settings?.autoDiscoverProjects ?? seedState.settings.autoDiscoverProjects,
      discoverUnknownFolders: base.settings?.discoverUnknownFolders ?? seedState.settings.discoverUnknownFolders,
      projectsRoots: base.settings?.projectsRoots ?? seedState.settings.projectsRoots,
      lastDiscoveryAt: base.settings?.lastDiscoveryAt ?? seedState.settings.lastDiscoveryAt,
      lastDiscoveryCount: base.settings?.lastDiscoveryCount ?? seedState.settings.lastDiscoveryCount,
      monthlyCostThresholdUsd:
        base.settings?.monthlyCostThresholdUsd ?? seedState.settings.monthlyCostThresholdUsd,
      costWarningPercent: base.settings?.costWarningPercent ?? seedState.settings.costWarningPercent,
      experienceLevel: base.settings?.experienceLevel ?? seedState.settings.experienceLevel,
      uiMode: base.settings?.uiMode ?? seedState.settings.uiMode,
      guidedJourneyStep: base.settings?.guidedJourneyStep ?? seedState.settings.guidedJourneyStep,
      guidedJourneyComplete:
        base.settings?.guidedJourneyComplete ?? seedState.settings.guidedJourneyComplete,
      guidedJourneyDismissed:
        base.settings?.guidedJourneyDismissed ?? seedState.settings.guidedJourneyDismissed,
      guidedJourneyLastBuildAt:
        base.settings?.guidedJourneyLastBuildAt ?? seedState.settings.guidedJourneyLastBuildAt,
      productionUrl: base.settings?.productionUrl ?? seedState.settings.productionUrl,
    },
    projects,
    bots,
    tasks: base.tasks?.length ? base.tasks : seedState.tasks,
    activity: dedupeActivityIds(base.activity?.length ? base.activity : seedState.activity),
    workspace: {
      ...defaultWorkspace(),
      ...base.workspace,
      voice: {
        ...defaultWorkspace().voice,
        ...base.workspace?.voice,
      },
    },
  };
}
