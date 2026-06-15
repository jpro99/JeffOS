import { featuresFromIntent } from "@/lib/mission/intent";
import type { Project, RiskLevel } from "@/lib/types";

export interface IntakeInput {
  name: string;
  pitch: string;
  description: string;
  goals: string[];
  platforms: string[];
  /** Parent folder on disk, e.g. C:\Projects */
  parentFolder?: string;
  /** Full path override, e.g. C:\Projects\My App Name */
  targetPath?: string;
}

export interface TimelinePhase {
  phase: string;
  duration: string;
}

export interface ScopeRecommendations {
  techPreferences: string;
  techLines: string[];
  timeline: string;
  timelinePhases: TimelinePhase[];
  budget: string;
  complexity: RiskLevel;
  targetUsers: string;
  stack: string[];
  rationale: string;
}

function intakeText(input: IntakeInput): string {
  return [input.pitch, input.description, ...input.goals].join(" ").toLowerCase();
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function countFeatures(input: IntakeInput): number {
  const intent = [input.pitch, input.description, ...input.goals].filter(Boolean).join("\n");
  return Math.max(1, featuresFromIntent(intent).length);
}

function inferComplexity(text: string, platformCount: number, featureCount: number): RiskLevel {
  if (
    hasAny(text, [
      /\b(legal|hipaa|bankruptcy|attorney|medical|finance|trading)\b/,
      /\b(payment|stripe|billing|subscription)\b.*\b(auth|user)\b/,
    ])
  ) {
    return "high";
  }
  if (
    hasAny(text, [
      /\b(ai|openai|gpt|gemini|claude|ml|machine learning)\b/,
      /\b(real-?time|websocket|live sync|map|gps|video)\b/,
      /\b(stripe|payment|auth|login|oauth)\b/,
    ]) ||
    platformCount >= 3 ||
    featureCount >= 5
  ) {
    return "medium";
  }
  return "low";
}

function inferTargetUsers(input: IntakeInput): string {
  const text = intakeText(input);
  if (/\b(attorney|lawyer|legal|law firm)\b/.test(text)) return "Attorneys and legal teams";
  if (/\b(contractor|construction|estimate)\b/.test(text)) return "Contractors and field teams";
  if (/\b(travel|trip|vacation|tourist)\b/.test(text)) return "Travelers planning trips";
  if (/\b(parent|kid|family|household)\b/.test(text)) return "Families and households";
  if (/\b(saas|business|team|company)\b/.test(text)) return "Business teams and operators";
  if (/\b(jeff|personal|myself)\b/.test(text)) return "Jeff + early adopters";
  return "Target users from your description — refine after MVP";
}

function buildTechLines(input: IntakeInput, text: string): string[] {
  const platforms = new Set(input.platforms.length ? input.platforms : ["web"]);
  const lines: string[] = [];

  if (platforms.has("web")) {
    lines.push("Web: Next.js + TypeScript + Tailwind — deploy on Vercel");
  }
  if (platforms.has("api")) {
    lines.push("API: Next.js Route Handlers or tRPC — same repo as web when possible");
  }
  if (platforms.has("mobile")) {
    if (platforms.has("web")) {
      lines.push("Mobile: Capacitor (wrap your Next/web UI) — iOS + Android from one codebase");
    } else {
      lines.push("Mobile: Expo + React Native — iOS + Android native shell");
    }
  }
  if (platforms.has("desktop")) {
    if (platforms.has("web") || platforms.has("mobile")) {
      lines.push("Desktop: Tauri 2 (lightweight) — same UI as web, native installer");
    } else {
      lines.push("Desktop: Tauri 2 + web frontend — Windows + Mac installers");
    }
  }

  if (hasAny(text, [/\b(supabase|postgres|database|db)\b/])) {
    lines.push("Data: Supabase Postgres (auth + RLS built in)");
  } else if (platforms.has("web")) {
    lines.push("Data: Vercel Postgres or Supabase — start free tier");
  }

  if (hasAny(text, [/\b(login|sign in|auth|user account|clerk)\b/])) {
    lines.push("Auth: Clerk — fastest for web + mobile");
  }
  if (hasAny(text, [/\b(stripe|payment|billing|subscription|checkout)\b/])) {
    lines.push("Payments: Stripe — webhooks + test mode first");
  }
  if (hasAny(text, [/\b(ai|openai|gpt|gemini|claude|llm|chatbot)\b/])) {
    lines.push("AI: OpenAI + Gemini — route cheap tasks to Gemini, hard tasks to GPT");
  }
  if (hasAny(text, [/\b(map|location|gps|geocode|travel)\b/])) {
    lines.push("Maps: MapTiler — predictable cost vs Google Maps");
  }
  if (hasAny(text, [/\b(email|notify|notification|resend)\b/])) {
    lines.push("Email: Resend — transactional only at first");
  }

  if (lines.length === 0) {
    lines.push("Web: Next.js + TypeScript + Tailwind on Vercel");
  }

  return lines;
}

function estimateTimeline(
  input: IntakeInput,
  platformCount: number,
  featureCount: number,
  complexity: RiskLevel,
): { summary: string; phases: TimelinePhase[] } {
  const text = intakeText(input);
  const rush = hasAny(text, [/\b(asap|urgent|one day|1 day|this week|fast)\b/]);
  const platforms = input.platforms.length ? input.platforms : ["web"];

  let webWeeks = complexity === "high" ? 3 : complexity === "medium" ? 2 : 1.5;
  let mobileWeeks = platforms.includes("mobile") ? (complexity === "high" ? 2 : 1) : 0;
  let desktopWeeks = platforms.includes("desktop") ? 1 : 0;
  let apiWeeks = platforms.includes("api") && !platforms.includes("web") ? 1 : 0;

  if (featureCount >= 5) webWeeks += 1;
  if (featureCount >= 8) webWeeks += 1;
  if (rush) {
    webWeeks = Math.max(1, webWeeks * 0.6);
    mobileWeeks = mobileWeeks * 0.7;
    desktopWeeks = desktopWeeks * 0.7;
  }

  const phases: TimelinePhase[] = [];
  if (platforms.includes("web") || platforms.includes("api")) {
    phases.push({
      phase: "Web MVP live (core features + verify build)",
      duration: rush
        ? `${Math.ceil(webWeeks)}–${Math.ceil(webWeeks + 1)} days with God Mode bots`
        : `${Math.ceil(webWeeks)}–${Math.ceil(webWeeks + 1)} weeks`,
    });
  }
  if (platforms.includes("mobile")) {
    phases.push({
      phase: "Mobile — Capacitor/Expo shell + store-ready build",
      duration: rush ? "3–5 days after web" : `${Math.ceil(mobileWeeks)} week${mobileWeeks > 1 ? "s" : ""}`,
    });
  }
  if (platforms.includes("desktop")) {
    phases.push({
      phase: "Desktop — Tauri installer (Windows + Mac)",
      duration: rush ? "2–4 days after web" : `${Math.ceil(desktopWeeks)} week`,
    });
  }
  if (platforms.includes("api") && platforms.includes("web")) {
    phases.push({
      phase: "API hardening — docs + auth on routes",
      duration: "Included in web phase unless API-only",
    });
  }

  const totalLow = Math.ceil(webWeeks + mobileWeeks + desktopWeeks + apiWeeks);
  const totalHigh = totalLow + (complexity === "high" ? 2 : 1);
  const platformLabel = platforms.join(" + ");
  const summary = rush
    ? `We believe ${platformLabel} MVP in about ${totalLow}–${totalHigh} weeks — God Mode one-day sprints per feature can compress this.`
    : `We believe ${platformLabel} MVP in about ${totalLow}–${totalHigh} weeks (${featureCount} features, ${complexity} complexity).`;

  return { summary, phases };
}

function estimateBudget(platformCount: number, text: string, complexity: RiskLevel): string {
  let low = 0;
  let high = 25;

  if (platformCount >= 1) {
    low += 0;
    high += 35;
  }
  if (hasAny(text, [/\b(ai|openai|gpt|gemini)\b/])) {
    low += 15;
    high += 75;
  }
  if (platformCount >= 2) {
    high += 15;
  }
  if (complexity === "high") {
    high += 40;
  }

  return low === 0
    ? `$0–$${high}/mo infra (free tiers + Vercel hobby) — scales with traffic`
    : `$${low}–$${high}/mo est. infra — not including Apple $99/yr if mobile store`;
}

/** Rule-based stack + timeline from idea, goals, and platforms */
export function recommendScope(input: IntakeInput): ScopeRecommendations {
  const text = intakeText(input);
  const platforms = input.platforms.length ? input.platforms : ["web"];
  const platformCount = platforms.length;
  const featureCount = countFeatures(input);
  const complexity = inferComplexity(text, platformCount, featureCount);
  const techLines = buildTechLines(input, text);
  const { summary, phases } = estimateTimeline(input, platformCount, featureCount, complexity);

  const techPreferences = techLines.join(" · ");

  const stack: string[] = [];
  if (platforms.includes("web")) stack.push("Next.js", "TypeScript", "Tailwind", "Vercel");
  if (platforms.includes("mobile")) stack.push(platforms.includes("web") ? "Capacitor" : "Expo");
  if (platforms.includes("desktop")) stack.push("Tauri");
  if (platforms.includes("api")) stack.push("API routes");
  if (hasAny(text, [/\b(supabase|postgres)\b/])) stack.push("Supabase");
  if (hasAny(text, [/\b(stripe)\b/])) stack.push("Stripe");
  if (hasAny(text, [/\b(clerk|auth|login)\b/])) stack.push("Clerk");
  if (hasAny(text, [/\b(ai|openai|gpt)\b/])) stack.push("OpenAI");

  const rationale =
    platformCount >= 3
      ? "Web + mobile + desktop — one Next.js UI, Capacitor for phones, Tauri for desktop. Fastest way to hit all three without three codebases."
      : platformCount === 2
        ? "Two platforms — share one UI codebase, wrap for the second platform."
        : "Single platform — ship web first, add others after MVP verifies.";

  return {
    techPreferences,
    techLines,
    timeline: summary,
    timelinePhases: phases,
    budget: estimateBudget(platformCount, text, complexity),
    complexity,
    targetUsers: inferTargetUsers(input),
    stack: stack.length ? stack : ["Next.js", "TypeScript", "Tailwind"],
    rationale,
  };
}

export function applyScopeRecommendations(project: Project, rec: ScopeRecommendations): Project {
  const orch = project.orchestration!;
  return {
    ...project,
    stack: rec.stack,
    orchestration: {
      ...orch,
      scope: {
        ...orch.scope,
        techPreferences: rec.techPreferences,
        targetUsers: rec.targetUsers || orch.scope.targetUsers,
        constraints: {
          budget: rec.budget,
          timeline: rec.timeline,
          complexity: rec.complexity,
        },
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function intakeFromProject(project: Project): IntakeInput {
  return {
    name: project.name,
    pitch: project.orchestration?.scope.pitch ?? project.description,
    description: project.description,
    goals: project.goals,
    platforms: project.orchestration?.scope.platforms ?? ["web"],
  };
}
