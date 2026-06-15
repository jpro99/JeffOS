import { createCommandSession } from "@/lib/mission/command-session";
import {
  buildErrorFixBundle,
  generateErrorFixPlan,
  selectedSteps,
} from "@/lib/mission/error-fix";
import { buildShipPrompt } from "@/lib/mission/deploy";
import { isVisionIntent, summarizeIntent } from "@/lib/mission/intent";
import {
  combineBuilderIntents,
  formatAddOnHeader,
  formatEnhancementBlock,
  suggestBuilderEnhancements,
} from "@/lib/mission/builder-enhancements";
import {
  formatOneDaySprintBlock,
  isOneDaySprintIntent,
} from "@/lib/mission/portfolio-pulse";
import { resolveGodBotRelativePath } from "@/lib/command-center/paths";
import type { MissionControlState, Project } from "@/lib/types";

export type BuilderRoute = "fix" | "gaps" | "ship" | "god" | "mission";

export interface BuilderBuildOptions {
  mode?: "fresh" | "addon";
  previousIntent?: string;
  addOnIntent?: string;
  addOnHistory?: string[];
}

export interface BuilderResult {
  route: BuilderRoute;
  routeLabel: string;
  prompt: string;
  project: Project;
  stepCount?: number;
  summary: string;
}

const ROUTE_LABELS: Record<BuilderRoute, string> = {
  fix: "Fix errors",
  gaps: "Close gaps",
  ship: "Ship to GitHub / Vercel",
  god: "God Mode — product vision",
  mission: "Build mission",
};

export function classifyBuilderIntent(text: string): BuilderRoute {
  const t = text.toLowerCase();
  if (
    isVisionIntent(text) ||
    /\b(god mode|simplest way|tell me what you need|next level|never heard|master programmer|greeting the interface|encompassing everything)\b/.test(
      t,
    )
  ) {
    return "god";
  }
  if (/\b(deploy|ship|vercel|github push|push to git|production)\b/.test(t)) return "ship";
  if (/\b(fix|error|broken|crash|bug|blocked|build fail)\b/.test(t)) return "fix";
  if (/\b(gap|missing|not built|close gap|hardening)\b/.test(t)) return "gaps";
  return "mission";
}

function finishBuilderResult(
  result: BuilderResult,
  intent: string,
  state: MissionControlState,
  options?: BuilderBuildOptions,
): BuilderResult {
  let prompt = result.prompt;

  if (options?.mode === "addon" && options.previousIntent && options.addOnIntent) {
    prompt = formatAddOnHeader(options.previousIntent, options.addOnIntent) + prompt;
  }

  prompt += formatEnhancementBlock(result.project, result.route, intent);

  if (isOneDaySprintIntent(intent)) {
    prompt += formatOneDaySprintBlock(state);
  }

  const session = result.project.ops.commandSession;
  const updatedProject: Project = session
    ? {
        ...result.project,
        ops: {
          ...result.project.ops,
          commandSession: {
            ...session,
            lastPrompt: prompt,
            combinedIntent: intent,
            addOns:
              options?.mode === "addon" && options.addOnIntent
                ? [
                    ...(session.addOns ?? []),
                    { intent: options.addOnIntent, at: new Date().toISOString() },
                  ]
                : session.addOns,
          },
        },
      }
    : result.project;

  return { ...result, prompt, project: updatedProject };
}

export { suggestBuilderEnhancements, combineBuilderIntents };

function buildGodBuilderPrompt(project: Project, intent: string, state: MissionControlState): string {
  const godBot = resolveGodBotRelativePath(project);
  const caveman =
    state.settings.cavemanDefault ||
    project.jeffMode === "caveman" ||
    state.settings.jeffMode === "caveman";

  return `# GOD BUILDER — Jeff OS next level
Jeff asked:
"${intent.trim()}"

You are master programmer in God Mode. Jeff wants the SIMPLEST programming interface ever:
- One greeting: "Tell me what you need. I'll build it."
- One box — type or talk
- Smart route: fix · build · ship · gaps · God Mode (auto-pick)
- One button: Build it → copy prompt → paste in Cursor
- Encompasses everything Jeff OS already has (import, verify, gaps, ship, missions)

═══════════════════════════════════════
PRODUCT SPEC — ship these in jeff-mission-control
═══════════════════════════════════════
1. **Builder Hub** — always-visible hero under header (Windows Copilot feel, Mac calm)
2. **Smart router** — classify intent → fix / gaps / ship / god / mission prompt
3. **Quick chips** — Fix errors | Close gaps | Ship | God Mode (one tap)
4. **Zero jargon** — "Build it" not "orchestration plan"
5. **Honest verify** — after build, Rescan + verify still gates ship
6. **Guided walkthrough** — EasyGuidedJourney walks every step to end product after Build it
7. **Add on →** — stack new ideas on same build; AI suggests upgrades beyond the ask
8. **Portfolio pulse** — EasyPortfolioPulse tracks all projects, verify, backlog
9. **One-day sprint** — God/Builder prompts compress bots to ship in one day not weeks

Read: AI-COMMAND-CENTER/CONTROL_TOWER.md, projects/jeff-os.md
Repo: ${project.path}
Voice: ${caveman ? "CAVEman" : "normal"}

Execute in order:
### Step 1 — Architect
Map current Easy Mode flows. One diagram in comments. Minimal diff plan.

### Step 2 — Builder
Implement/refine EasyBuilderHub + builder-router.ts. Match existing Tailwind patterns.

### Step 3 — Builder
Polish: greeting copy, route chips, copy button, project picker.

### Step 4 — Guided journey
EasyGuidedJourney + guided-journey.ts — step walker after Build it (import → Cursor → verify → ship → done)

### Step 5 — Test
npm run build in jeff-mission-control. Must pass.

Reply each step: STEP N DONE — one line
Final: GOD BUILDER COMPLETE — Jeff can use Builder Hub on localhost:3000/easy — walkthrough guides to ship
`;
}

function buildFixPrompt(project: Project, state: MissionControlState, intent: string): BuilderResult | null {
  let mission = generateErrorFixPlan(project, state.bots);
  if (mission.steps.length === 0) return null;

  mission = { ...mission, status: "running", startedAt: new Date().toISOString() };
  const bundle = buildErrorFixBundle(project, mission, state);
  if (!bundle) return null;

  const updated: Project = {
    ...project,
    ops: { ...project.ops, errorFixMission: { ...mission, lastPrompt: bundle } },
  };

  return {
    route: "fix",
    routeLabel: ROUTE_LABELS.fix,
    prompt: `${bundle}\n\nJeff also said: ${intent.trim()}`,
    project: updated,
    stepCount: selectedSteps(mission).length,
    summary: `Fix mission — ${selectedSteps(mission).length} steps`,
  };
}

function buildShipPromptResult(
  project: Project,
  state: MissionControlState,
  intent: string,
): BuilderResult {
  const action = /vercel/i.test(intent) ? ("vercel-ship" as const) : ("full-ship" as const);
  const git: import("@/lib/project-scan/git-status").GitStatusSnapshot = {
    ok: false,
    repoPath: project.path ?? "",
    isRepo: true,
    branch: "main",
    hasRemote: false,
    remoteUrl: "",
    clean: false,
    changedFiles: 0,
    ahead: 0,
    behind: 0,
    lastCommit: "",
    summary: "Run git status in project folder — Jeff OS will refresh on Ship panel",
  };
  const prompt = buildShipPrompt(action, project, state, git, {
    vercelLinked: false,
    buildVerified: project.ops.liveVerify?.canAdvance ?? false,
  });

  return {
    route: "ship",
    routeLabel: ROUTE_LABELS.ship,
    prompt,
    project,
    summary: "Ship prompt — run in Cursor, then push",
  };
}

/** One intent → smart route → Cursor-ready prompt + updated project state */
export function buildFromIntent(
  project: Project,
  intent: string,
  state: MissionControlState,
  options?: BuilderBuildOptions,
): BuilderResult | null {
  const trimmed = intent.trim();
  if (!trimmed) return null;

  const route = classifyBuilderIntent(trimmed);
  let result: BuilderResult | null = null;

  if (route === "fix") {
    result = buildFixPrompt(project, state, trimmed);
  }

  if (!result && route === "gaps") {
    const session = createCommandSession(
      project,
      trimmed.includes("gap") ? trimmed : `Close gaps: ${trimmed}`,
      state,
    );
    if (session) {
      result = {
        route: "gaps",
        routeLabel: ROUTE_LABELS.gaps,
        prompt: session.prompt.replace("# MISSION", "# GAP MISSION"),
        project: session.project,
        stepCount: session.stepCount,
        summary: summarizeIntent(trimmed),
      };
    }
  }

  if (!result && route === "ship") {
    result = buildShipPromptResult(project, state, trimmed);
  }

  if (!result && route === "god") {
    const session = createCommandSession(project, trimmed, state);
    if (session) {
      const godOverlay = buildGodBuilderPrompt(session.project, trimmed, state);
      result = {
        route: "god",
        routeLabel: ROUTE_LABELS.god,
        prompt: `${godOverlay}\n\n---\n\n## Full bot mission (if needed)\n\n${session.prompt}`,
        project: {
          ...session.project,
          ops: {
            ...session.project.ops,
            commandSession: session.project.ops.commandSession,
          },
        },
        stepCount: session.stepCount,
        summary: summarizeIntent(trimmed),
      };
    }
  }

  if (!result) {
    const session = createCommandSession(project, trimmed, state);
    if (!session) return null;
    result = {
      route: "mission",
      routeLabel: ROUTE_LABELS.mission,
      prompt: session.prompt,
      project: session.project,
      stepCount: session.stepCount,
      summary: summarizeIntent(trimmed),
    };
  }

  if (!result) return null;
  return finishBuilderResult(result, trimmed, state, options);
}

/** Stack a new idea on the current build — same project, merged intent */
export function buildAddOnFromIntent(
  project: Project,
  previousIntent: string,
  addOnIntent: string,
  state: MissionControlState,
  addOnHistory: string[] = [],
): BuilderResult | null {
  const combined = combineBuilderIntents(previousIntent, addOnIntent, addOnHistory);
  return buildFromIntent(project, combined, state, {
    mode: "addon",
    previousIntent,
    addOnIntent,
    addOnHistory,
  });
}

export function routeHint(intent: string): string {
  const route = classifyBuilderIntent(intent);
  return ROUTE_LABELS[route];
}
