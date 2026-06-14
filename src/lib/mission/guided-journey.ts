import type { AppSettings, MissionControlState, Project } from "@/lib/types";

/*
 * Easy Mode flow (Builder Hub → end product)
 *
 *   [Welcome] → [Import disk] → [Pick project] → [Build it]
 *        ↓              ↓               ↓              ↓
 *     /easy      EasyImportHub    Builder select   Builder Hub
 *        ↓              ↓               ↓              ↓
 *   [Paste Cursor] → [Rescan+verify] → [Ship] → [Done]
 *        ↓                  ↓            ↓         ↑
 *   prompt panel      project snapshot  ship    [Add on →] loops back
 */

export type GuidedStepId =
  | "welcome"
  | "import"
  | "pick"
  | "build"
  | "cursor"
  | "verify"
  | "ship"
  | "done";

export interface GuidedJourneyStep {
  id: GuidedStepId;
  title: string;
  body: string;
  href?: string;
  hash?: string;
}

export const GUIDED_JOURNEY_STEPS: GuidedJourneyStep[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: "Jeff Mission Control Easy Mode — one box at top builds everything.",
    href: "/easy",
  },
  {
    id: "import",
    title: "Import",
    body: "Scan your projects folder. Anyone can bring work from disk.",
    href: "/easy",
    hash: "import-projects",
  },
  {
    id: "pick",
    title: "Pick project",
    body: "Choose which app in the Builder Hub dropdown.",
    href: "/easy",
    hash: "builder-hub",
  },
  {
    id: "build",
    title: "Build it",
    body: "Type or talk what you need. Click Build it → copies prompt.",
    href: "/easy",
    hash: "builder-hub",
  },
  {
    id: "cursor",
    title: "Paste in Cursor",
    body: "Paste prompt in Cursor on that project folder. Let agent run.",
    href: "/easy",
    hash: "builder-hub",
  },
  {
    id: "verify",
    title: "Verify honest",
    body: "Rescan + verify build on project page. Ship only when green.",
  },
  {
    id: "ship",
    title: "Ship",
    body: "Push to GitHub / Vercel when verify says you can advance.",
  },
  {
    id: "done",
    title: "Done",
    body: "Mainstream path complete. Repeat Builder Hub anytime.",
    href: "/easy",
  },
];

export const GUIDED_STEP_COUNT = GUIDED_JOURNEY_STEPS.length;

export const DEFAULT_GUIDED_JOURNEY: Pick<
  AppSettings,
  "guidedJourneyStep" | "guidedJourneyComplete" | "guidedJourneyDismissed" | "guidedJourneyLastBuildAt"
> = {
  guidedJourneyStep: 0,
  guidedJourneyComplete: false,
  guidedJourneyDismissed: false,
  guidedJourneyLastBuildAt: null,
};

export function activeProject(state: MissionControlState): Project | undefined {
  const id = state.workspace.activeProjectId;
  return id ? state.projects.find((p) => p.id === id) : state.projects[0];
}

/** Infer furthest step user likely reached from live state */
export function inferGuidedJourneyStep(state: MissionControlState): number {
  let step = 0;
  const { settings } = state;

  if (settings.lastDiscoveryAt || settings.lastDiscoveryCount > 0) step = 1;
  if (state.workspace.activeProjectId || state.projects.length > 0) step = Math.max(step, 2);
  if (settings.guidedJourneyLastBuildAt) step = Math.max(step, 4);

  const project = activeProject(state);
  if (project?.ops.liveVerify?.canAdvance) step = Math.max(step, 6);
  if (settings.guidedJourneyComplete) step = GUIDED_STEP_COUNT - 1;

  return Math.min(step, GUIDED_STEP_COUNT - 1);
}

export function effectiveGuidedStep(state: MissionControlState): number {
  const stored = state.settings.guidedJourneyStep ?? 0;
  const inferred = inferGuidedJourneyStep(state);
  return Math.max(stored, inferred);
}

export function stepHref(step: GuidedJourneyStep, projectId?: string | null): string | undefined {
  if (step.id === "verify" || step.id === "ship") {
    return projectId ? `/easy/projects/${projectId}` : "/easy/projects";
  }
  if (step.href) {
    return step.hash ? `${step.href}#${step.hash}` : step.href;
  }
  return undefined;
}

export function advanceGuidedJourney(
  settings: AppSettings,
  toStep: number,
  extra?: Partial<AppSettings>,
): Partial<AppSettings> {
  const next = Math.min(Math.max(toStep, settings.guidedJourneyStep ?? 0), GUIDED_STEP_COUNT - 1);
  const complete = next >= GUIDED_STEP_COUNT - 1;
  return {
    guidedJourneyStep: next,
    guidedJourneyComplete: complete || settings.guidedJourneyComplete,
    ...extra,
  };
}

export function markGuidedStepDone(settings: AppSettings): Partial<AppSettings> {
  const current = effectiveGuidedStepFromSettings(settings);
  return advanceGuidedJourney(settings, current + 1);
}

function effectiveGuidedStepFromSettings(settings: AppSettings): number {
  return settings.guidedJourneyStep ?? 0;
}

export function onBuilderBuild(settings: AppSettings): Partial<AppSettings> {
  const cursorStep = GUIDED_JOURNEY_STEPS.findIndex((s) => s.id === "cursor");
  return advanceGuidedJourney(settings, cursorStep, {
    guidedJourneyLastBuildAt: new Date().toISOString(),
  });
}

export function onImportSuccess(settings: AppSettings): Partial<AppSettings> {
  const importStep = GUIDED_JOURNEY_STEPS.findIndex((s) => s.id === "import");
  return advanceGuidedJourney(settings, importStep + 1);
}
