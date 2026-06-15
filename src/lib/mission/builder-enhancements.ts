import type { BuilderRoute } from "@/lib/mission/builder-router";
import type { Project } from "@/lib/types";

/** Local “you could also add” chips — no API call */
export function suggestBuilderEnhancements(
  project: Project,
  route: BuilderRoute,
  intent: string,
): string[] {
  const ideas: string[] = [];
  const t = intent.toLowerCase();

  if (route === "god" || route === "mission") {
    ideas.push("Honest cost breakdown — tap est. $/mo for line-by-line catalog truth");
    ideas.push("Portfolio pulse — see all projects verify and backlog at once");
    ideas.push("One-day sprint — bots ship today not weeks");
    if (!t.includes("walkthrough") && !t.includes("guided")) {
      ideas.push("Guided walkthrough from Builder Hub to ship");
    }
    if (!t.includes("welcome") && !t.includes("first-run")) {
      ideas.push("First-run welcome — feels like installing an app");
    }
  }

  if (route === "fix") {
    ideas.push("Add test so this error never comes back");
    ideas.push("CI gate — build must pass before ship");
  }

  if (route === "gaps") {
    ideas.push("Honest Rescan + verify — no fake green");
    ideas.push("One-click gap fix prompt per yellow item");
  }

  if (route === "ship") {
    ideas.push("Confirm Vercel env vars before push");
    ideas.push("Post-ship smoke check on live URL");
  }

  if (!project.ops.liveVerify?.canAdvance) {
    ideas.push("Wire verify step into Easy project page — big Rescan button");
  }

  if ((project.ops.missingPieces?.length ?? 0) > 0) {
    ideas.push("Close live gaps before next feature");
  }

  const fromGod = project.ops.godModeIdeas.slice(0, 2).map((g) => g.insight);
  for (const g of fromGod) {
    if (g && !ideas.some((i) => i.toLowerCase().includes(g.slice(0, 20).toLowerCase()))) {
      ideas.push(g);
    }
  }

  return ideas.slice(0, 5);
}

export function combineBuilderIntents(previous: string, addOn: string, history?: string[]): string {
  const prev = previous.trim();
  const next = addOn.trim();
  if (!prev) return next;
  if (!next) return prev;

  const all = [...(history ?? []), next].filter(Boolean);
  if (all.length === 1) {
    return `${prev}\n\nAlso add on: ${next}`;
  }

  return `${history?.[0] ?? prev}

Add-ons so far:
${all.map((line) => `- ${line}`).join("\n")}

New add-on: ${next}`;
}

export function formatAddOnHeader(previousIntent: string, addOnIntent: string): string {
  return `# ADD-ON BUILD — keep going
Jeff already started. Build on top — do not throw away prior work.

Previous:
"${previousIntent.trim()}"

New add-on:
"${addOnIntent.trim()}"

---
`;
}

/** Cursor must suggest upgrades beyond the ask */
export function formatEnhancementBlock(
  project: Project,
  route: BuilderRoute,
  intent: string,
): string {
  const seeds = suggestBuilderEnhancements(project, route, intent);
  return `
═══════════════════════════════════════
PLUS — MAKE IT BETTER (Jeff OS God Mode)
═══════════════════════════════════════
After you ship what Jeff asked:
1. Tell Jeff: "You could also add this — great idea:" with 2–3 concrete upgrades BEYOND the request
2. Ask once: "Want me to add any of these?" — no silent scope creep
3. If Jeff says yes in Jeff OS → he uses **Add on →** and you continue the same build

Seed ideas (use or beat these):
${seeds.map((s, i) => `${i + 1}. ${s}`).join("\n")}
`;
}
