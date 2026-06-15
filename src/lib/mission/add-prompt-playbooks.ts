import type { BuildMode } from "@/lib/mission/suggest-project-bots";
import type { MissionControlState, Project } from "@/lib/types";

export type AddPromptDomain =
  | "remote-desktop"
  | "auth"
  | "deploy"
  | "ui"
  | "legal"
  | "mobile"
  | "generic";

export interface AddIntentProfile {
  domain: AddPromptDomain;
  phase1Goal: string;
  phase2Later: string | null;
  acceptance: string[];
  architectTask: string;
  specTask: string;
  builderHint: string;
  outOfScope: string[];
}

export interface ProjectPlaybook {
  extraRead: string[];
  bootNotes: string[];
  acceptanceExtras: string[];
  architectNote?: string;
  verifyOverride?: string;
}

const PROJECT_PLAYBOOKS: Record<string, ProjectPlaybook> = {
  "all-in-one-edgar": {
    extraRead: ["START-HERE-EDGAR.md", "DEPLOY.md or DEPLOYMENT.md", "CLAUDE.md if present"],
    bootNotes: [
      "Boot: START-HERE-EDGAR.md → DEPLOY.md → this God Bot",
      "Dev: .\\Run-Edgar-Dev.ps1 — https://localhost:7099",
      "Test on PC dev before NAS Docker",
    ],
    acceptanceExtras: [
      "Microsoft Entra sign-in path preserved — no auth bypass",
      "Agent ↔ server contract unchanged unless migration documented",
      "Follow existing PS1/Docker patterns in scripts/ and NasConfigs/",
    ],
    architectNote: "Solution AllInOneEdgar.sln — src/, docker/, NasConfigs/, scripts/",
    verifyOverride: "dotnet build AllInOneEdgar.sln",
  },
  "my-bankruptcy": {
    extraRead: ["repo README", "DEPLOY.md — never build during dev"],
    bootNotes: ["Legal SaaS — careful mode always", "Stripe/webhook/RLS patterns from God Bot"],
    acceptanceExtras: [
      "No PII in logs; RLS and auth paths reviewed",
      "Never run production deploy steps during local dev",
    ],
    architectNote: "ChapterAI monorepo — match existing legal/matter patterns",
  },
  "story-pals": {
    extraRead: ["projects/story-pals.md"],
    bootNotes: ["Spec before big build — product goal still fuzzy in God Bot"],
    acceptanceExtras: ["Core loop defined in 3 bullets before large UI work"],
    architectNote: "Flutter scaffold — clarify product in Spec step first",
    verifyOverride: "flutter analyze (or flutter test if configured)",
  },
  "demand-generator-pro": {
    extraRead: ["repo README", "God Bot security section"],
    bootNotes: ["Legal PDF/AI — Security Worker mindset on matter data"],
    acceptanceExtras: ["Matter/doc access follows existing auth; no secrets in client"],
  },
  "dunningguard": {
    extraRead: ["projects/dunningguard.md"],
    bootNotes: ["Stripe webhooks + RLS — Security Worker first on payment paths"],
    acceptanceExtras: ["Webhook signatures verified; Connect paths unchanged unless spec'd"],
  },
};

function playbookKey(project: Project): string | null {
  if (PROJECT_PLAYBOOKS[project.slug]) return project.slug;
  const fromId = project.id.replace(/^proj-/, "");
  if (PROJECT_PLAYBOOKS[fromId]) return fromId;
  return null;
}

export function getProjectPlaybook(project: Project): ProjectPlaybook | null {
  const key = playbookKey(project);
  return key ? PROJECT_PLAYBOOKS[key] : null;
}

export function playbookExtraRead(project: Project): string[] {
  return getProjectPlaybook(project)?.extraRead ?? [];
}

export function playbookVerifyOverride(project: Project): string | null {
  return getProjectPlaybook(project)?.verifyOverride ?? null;
}

export function applyProjectPlaybook(profile: AddIntentProfile, project: Project, isBig: boolean): AddIntentProfile {
  const playbook = getProjectPlaybook(project);
  if (!playbook) return profile;

  const acceptance =
    isBig || profile.domain !== "ui" ?
      [...profile.acceptance, ...playbook.acceptanceExtras]
    : profile.acceptance;

  let architectTask = profile.architectTask;
  if (playbook.architectNote) {
    architectTask = `${architectTask} — ${playbook.architectNote}`;
  }

  return { ...profile, acceptance, architectTask };
}

export function formatPlaybookBootBlock(project: Project): string | null {
  const playbook = getProjectPlaybook(project);
  if (!playbook?.bootNotes.length) return null;
  return playbook.bootNotes.map((n) => `- ${n}`).join("\n");
}

export function applyCostModeToProfile(
  profile: AddIntentProfile,
  state: MissionControlState,
  buildMode: BuildMode,
): AddIntentProfile {
  if (buildMode === "god") {
    return {
      ...profile,
      architectTask: `${profile.architectTask} — God Mode: premium UX on core path even if more code`,
      builderHint: `${profile.builderHint} — beat incumbents on clarity and consent`,
    };
  }

  if (buildMode === "careful") {
    return {
      ...profile,
      architectTask: `${profile.architectTask} — security and correctness over speed`,
      builderHint: `${profile.builderHint} — document risks; no shortcuts on auth/legal/payments`,
    };
  }

  if (state.settings.costSaveMode) {
    return {
      ...profile,
      architectTask: `${profile.architectTask} — cheap path: reuse OSS/libs before custom protocol`,
      builderHint: `${profile.builderHint} — no new deps unless acceptance requires it`,
    };
  }

  return profile;
}

export function formatGodModeBlock(project: Project, buildMode: BuildMode): string {
  const ideas = project.ops.godModeIdeas.filter((i) => i.insight.trim());
  if (ideas.length === 0) return "";

  const lines = ideas.slice(0, buildMode === "god" ? 2 : 1).map((idea, i) => {
    const tag = i === 0 ? "God Mode (after Phase 1 — optional)" : "God Mode #2";
    return `${tag}: ${idea.insight.trim().slice(0, 180)}`;
  });

  return lines.join("\n");
}
