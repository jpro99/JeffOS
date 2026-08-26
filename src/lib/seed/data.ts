import type { MissionControlState } from "@/lib/types";
import { PROJECT_OPS } from "@/lib/seed/project-ops";

const now = new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

export const seedState: MissionControlState = {
  interfaces: [
    { id: "cursor", name: "Cursor", description: "Main hub — fast edits, UI, file-by-file", icon: "⌘" },
    { id: "claude-code", name: "Claude Code", description: "Multi-file, terminal, autonomous coding", icon: "◘" },
    { id: "regular-claude", name: "Regular Claude", description: "Planning, specs, architecture, prompts", icon: "◉" },
    { id: "future-custom", name: "Future / Custom", description: "Placeholder for other tools", icon: "◇" },
  ],
  modelClasses: [
    { id: "cheap-fast", name: "Cheap Fast", description: "Quick passes, low cost", costTier: "low" },
    { id: "balanced", name: "Balanced", description: "Default quality/cost balance", costTier: "mid" },
    { id: "deep-reasoning", name: "Deep Reasoning", description: "Hard problems, tradeoffs", costTier: "high" },
    { id: "code-heavy", name: "Code Heavy", description: "Implementation focus", costTier: "mid" },
    { id: "review-heavy", name: "Review Heavy", description: "Audit and review focus", costTier: "mid" },
    { id: "planning-heavy", name: "Planning Heavy", description: "Specs and architecture", costTier: "mid" },
    { id: "long-context", name: "Long Context", description: "Large repo / epic scope", costTier: "high" },
    { id: "autonomous-heavy", name: "Autonomous Heavy", description: "Agent runs with less hand-holding", costTier: "high" },
  ],
  settings: {
    jeffMode: "caveman",
    cavemanDefault: true,
    costSaveMode: true,
    defaultInterface: "cursor",
    autoRoute: true,
    preferredModelClass: "balanced",
    preferredBotSequence: ["control-tower", "project-god-bot", "builder-bot", "reviewer-bot"],
    compactMode: false,
    mobileMode: false,
    voiceEnabled: true,
    voiceMode: "push-to-talk",
    voiceResponseEnabled: true,
    autoDiscoverProjects: true,
    discoverUnknownFolders: true,
    projectsRoots: ["C:\\Projects", "C:\\vercel generator"],
    lastDiscoveryAt: null,
    lastDiscoveryCount: 0,
    monthlyCostThresholdUsd: 100,
    costWarningPercent: 80,
    experienceLevel: "comfortable",
    uiMode: "easy",
    guidedJourneyStep: 0,
    guidedJourneyComplete: false,
    guidedJourneyDismissed: false,
    guidedJourneyLastBuildAt: null,
    productionUrl: null,
  },
  projects: [],
  bots: [],
  tasks: [],
  routingPresets: [],
  routingHistory: [],
  workspace: { activeProjectId: null, activeTaskId: null, recentProjectIds: [], queueTaskIds: [], activeRoute: null, routeMode: "auto", pinnedProjectIds: [], openWorkspaceIds: [], minimizedProjectIds: [], handoffNote: "", voice: { lastVoiceCommand: null, micPermissionState: "unknown" } },
  activity: [],
};

export const STORAGE_KEY = "jeff-mission-control-v9";
