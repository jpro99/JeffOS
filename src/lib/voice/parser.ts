import type {
  MissionControlState,
  QuickCommandId,
  VoiceCommandInterpretation,
} from "@/lib/types";
import { getCommandLabel } from "@/lib/intelligence/commands";

interface PhraseRule {
  patterns: RegExp[];
  command?: QuickCommandId;
  action?: VoiceCommandInterpretation["targetAction"];
  statusLookup?: VoiceCommandInterpretation["statusLookup"];
  routingPreference?: "cheapest" | "strongest";
  requiresConfirmation?: boolean;
  confidence: number;
  label: string;
}

const PHRASE_RULES: PhraseRule[] = [
  {
    patterns: [/continue\s+cod/i, /keep\s+cod/i, /resume\s+cod/i, /continue\s+build/i, /continue\s+from\s+where/i],
    command: "continue-coding",
    confidence: 0.88,
    label: "Continue coding",
  },
  {
    patterns: [/fix\s+next\s+issue/i, /fix\s+next\s+error/i, /next\s+issue/i],
    command: "fix-next-issue",
    confidence: 0.9,
    label: "Fix next issue",
  },
  {
    patterns: [/fix\s+error/i, /what\s+is\s+broken/i, /show\s+.*broken/i, /review\s+error/i],
    command: "fix-errors",
    confidence: 0.85,
    label: "Fix errors",
  },
  {
    patterns: [/review\s+security/i, /strengthen\s+security/i, /security\s+review/i],
    command: "review-security",
    confidence: 0.9,
    label: "Review security",
  },
  {
    patterns: [/god\s+mode/i, /ultimate\s+mode/i, /open\s+god/i],
    command: "god-mode",
    confidence: 0.92,
    label: "God Mode",
  },
  {
    patterns: [/generate\s+best\s+prompt/i, /best\s+prompt/i, /generate\s+prompt/i],
    command: "generate-prompt",
    confidence: 0.88,
    label: "Generate best prompt",
  },
  {
    patterns: [/route\s+.*bot/i, /best\s+bot/i, /route\s+this/i],
    command: "route-task",
    confidence: 0.85,
    label: "Route to best bot",
  },
  {
    patterns: [/what\s+should\s+i\s+do/i, /what\s+to\s+do/i, /show\s+me\s+what/i, /next\s+step/i],
    command: "what-to-do",
    confidence: 0.9,
    label: "What to do next",
  },
  {
    patterns: [/audit\s+readiness/i, /launch\s+readiness/i, /prepare\s+launch/i, /prepare\s+for\s+launch/i],
    command: "audit-readiness",
    confidence: 0.86,
    label: "Audit readiness",
  },
  {
    patterns: [/block(ing|ers?)\s+launch/i, /what\s+is\s+blocking/i, /blocking\s+launch/i],
    command: "audit-readiness",
    statusLookup: "blockers",
    confidence: 0.87,
    label: "Launch blockers",
  },
  {
    patterns: [/project\s+readiness/i, /show\s+readiness/i, /how\s+ready/i],
    statusLookup: "readiness",
    confidence: 0.84,
    label: "Project readiness",
  },
  {
    patterns: [/build\s+fast/i, /move\s+fast/i],
    command: "build-fast",
    confidence: 0.82,
    label: "Build fast",
  },
  {
    patterns: [/cheapest\s+path/i, /use\s+cheapest/i, /save\s+cost/i],
    routingPreference: "cheapest",
    confidence: 0.88,
    label: "Use cheapest path",
  },
  {
    patterns: [/strongest\s+path/i, /use\s+strongest/i, /best\s+quality/i, /highest\s+quality/i],
    routingPreference: "strongest",
    confidence: 0.88,
    label: "Use strongest path",
  },
  {
    patterns: [/open\s+home/i, /go\s+home/i],
    action: "navigate-home",
    confidence: 0.8,
    label: "Open home",
  },
  {
    patterns: [/open\s+tasks/i, /show\s+tasks/i],
    action: "navigate-tasks",
    confidence: 0.8,
    label: "Open tasks",
  },
  {
    patterns: [/open\s+bots/i, /show\s+bots/i],
    action: "navigate-bots",
    confidence: 0.8,
    label: "Open bots",
  },
];

const PROJECT_ALIASES: Record<string, string[]> = {
  "proj-demand-generator": ["demand generator", "demand gen", "demand letter", "vercel generator"],
  "proj-home-compass": ["home compass", "household compass", "compass"],
  "proj-tripflow": ["tripflow", "roamwise", "kepi travel", "kepi", "travel"],
  "proj-keps-trading": ["keps trading", "kepi trading", "keps", "trading"],
  "proj-points-miles": ["points and miles", "points miles", "points & miles"],
  "proj-general-dev": ["general dev", "language app", "utility", "translator", "language translator"],
  "proj-new-idea": ["new idea", "new project", "greenfield"],
  "proj-jeff-os": ["jeff os", "jeff-os", "mission control", "command center", "jeff mission control"],
  "proj-bankruptcy": ["bankruptcy", "my bankruptcy", "chapterai", "chapter ai"],
  "proj-takeoff-pro": ["takeoff pro", "takeoff", "contractor takeoff", "contractor take off"],
  "proj-dunningguard": ["dunningguard", "dunning guard"],
  "proj-kepi-search": ["kepi search", "hotel map"],
  "proj-edgar": ["edgar", "all in one edgar", "all-in-one edgar"],
  "proj-story-pals": ["story pals", "story-pals"],
  "proj-takeoff-staging": ["takeoff staging", "contractor staging"],
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s&]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreProjectMatch(query: string, projectId: string, name: string, slug: string): number {
  const q = normalize(query);
  const aliases = [name, slug.replace(/-/g, " "), ...(PROJECT_ALIASES[projectId] ?? [])];
  let best = 0;
  for (const alias of aliases) {
    const a = normalize(alias);
    if (q.includes(a) || a.includes(q)) best = Math.max(best, 0.95);
    const words = a.split(" ").filter((w) => w.length > 2);
    const hits = words.filter((w) => q.includes(w)).length;
    if (hits >= 2) best = Math.max(best, 0.9);
    if (hits === 1 && words.length === 1) best = Math.max(best, 0.75);
  }
  if (q.includes("on ") || q.includes("for ")) {
    const tail = q.split(/\bon\b|\bfor\b/).pop()?.trim() ?? "";
    for (const alias of aliases) {
      if (normalize(alias).includes(tail) || tail.includes(normalize(alias))) {
        best = Math.max(best, 0.92);
      }
    }
  }
  return best;
}

function findProject(transcript: string, state: MissionControlState, fallbackId: string | null) {
  let bestId = fallbackId;
  let bestScore = fallbackId ? 0.45 : 0;

  for (const p of state.projects) {
    const score = scoreProjectMatch(transcript, p.id, p.name, p.slug);
    if (score > bestScore) {
      bestScore = score;
      bestId = p.id;
    }
  }

  const openMatch = transcript.match(/\bopen\s+(.+)/i);
  if (openMatch) {
    const target = openMatch[1];
    for (const p of state.projects) {
      const score = scoreProjectMatch(target, p.id, p.name, p.slug);
      if (score > bestScore) {
        bestScore = score;
        bestId = p.id;
      }
    }
  }

  return { projectId: bestScore >= 0.45 ? bestId : fallbackId, projectScore: bestScore };
}

function findBot(transcript: string, state: MissionControlState, projectId: string | null) {
  const q = normalize(transcript);
  let bestId: string | undefined;
  let bestScore = 0;

  const candidates = projectId
    ? state.bots.filter((b) => b.projectIds.length === 0 || b.projectIds.includes(projectId))
    : state.bots;

  for (const b of candidates) {
    const text = normalize(`${b.name} ${b.role} ${b.type.replace(/-/g, " ")}`);
    if (q.includes(text) || text.split(" ").some((w) => w.length > 3 && q.includes(w))) {
      const score = q.includes(normalize(b.name)) ? 0.9 : 0.65;
      if (score > bestScore) {
        bestScore = score;
        bestId = b.id;
      }
    }
  }
  return bestId;
}

function findTask(transcript: string, state: MissionControlState, projectId: string | null) {
  const q = normalize(transcript);
  const tasks = projectId ? state.tasks.filter((t) => t.projectId === projectId) : state.tasks;
  for (const t of tasks) {
    if (q.includes(normalize(t.title))) return t.id;
  }
  return undefined;
}

export function parseVoiceCommand(
  rawTranscript: string,
  state: MissionControlState,
  activeProjectId: string | null,
): VoiceCommandInterpretation {
  const transcript = rawTranscript.trim();
  const normalized = normalize(transcript);

  if (!transcript) {
    return {
      rawTranscript: transcript,
      interpretedCommand: "Empty command",
      confidence: 0,
      requiresConfirmation: false,
      spokenResponse: "Did not catch that.",
    };
  }

  const { projectId, projectScore } = findProject(transcript, state, activeProjectId);
  const project = projectId ? state.projects.find((p) => p.id === projectId) : undefined;

  let matchedRule: PhraseRule | undefined;
  for (const rule of PHRASE_RULES) {
    if (rule.patterns.some((p) => p.test(transcript))) {
      matchedRule = rule;
      break;
    }
  }

  const botId = findBot(transcript, state, projectId);
  const taskId = findTask(transcript, state, projectId);

  if (!matchedRule && projectScore >= 0.7 && /\bopen\b/i.test(transcript)) {
    matchedRule = {
      patterns: [],
      action: "open-project",
      confidence: projectScore,
      label: `Open ${project?.name ?? "project"}`,
    };
  }

  if (!matchedRule && projectScore >= 0.65 && projectId) {
    matchedRule = {
      patterns: [],
      command: "what-to-do",
      confidence: Math.max(0.55, projectScore * 0.85),
      label: "Project command",
    };
  }

  const commandId = matchedRule?.command;
  const interpretedCommand = matchedRule?.label ?? (project ? `Focus ${project.name}` : "Unknown command");

  let confidence = matchedRule?.confidence ?? (projectScore >= 0.5 ? projectScore * 0.7 : 0.35);
  if (projectScore >= 0.7) confidence = Math.min(0.98, confidence + 0.08);

  const requiresConfirmation =
    matchedRule?.requiresConfirmation ?? (confidence < 0.72 || (!commandId && !matchedRule?.action));

  let spokenResponse = "";
  if (matchedRule?.statusLookup === "readiness" && project) {
    spokenResponse = `${project.name} is ${project.ops.readinessScore} percent ready.`;
  } else if (matchedRule?.statusLookup === "blockers" && project) {
    const blockers = project.ops.blockers.slice(0, 2).join(". ") || "No major blockers listed.";
    spokenResponse = `Top blocker: ${blockers}`;
  } else if (commandId === "fix-errors" && project?.ops.errors[0]) {
    spokenResponse = `Top issue: ${project.ops.errors[0].title}`;
  } else if (commandId && project) {
    spokenResponse = `${getCommandLabel(commandId)} for ${project.name}.`;
  } else if (matchedRule?.action === "open-project" && project) {
    spokenResponse = `Opening ${project.name}.`;
  } else if (project) {
    spokenResponse = `Working on ${project.name}.`;
  }

  return {
    rawTranscript: transcript,
    interpretedCommand,
    quickCommandId: commandId,
    targetProjectId: projectId ?? undefined,
    targetBotId: botId,
    targetTaskId: taskId,
    targetAction: matchedRule?.action ?? (projectId && !commandId ? "focus-project" : undefined),
    confidence,
    requiresConfirmation,
    navigateTo: projectId ? `/projects/${projectId}` : undefined,
    spokenResponse,
    routingPreference: matchedRule?.routingPreference,
    statusLookup: matchedRule?.statusLookup,
  };
}
