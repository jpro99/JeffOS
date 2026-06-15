import type { ProjectBrief } from "@/lib/project-scan/brief";
import type { GodModeIdea, Project } from "@/lib/types";

export type WhatsNextSource = "god-mode" | "backlog" | "next-action" | "gap" | "prompt";

export interface WhatsNextSuggestion {
  id: string;
  title: string;
  detail: string;
  source: WhatsNextSource;
  /** Plain-English intent for Add to project / Cursor */
  buildIntent: string;
  leverage?: GodModeIdea["leverage"];
}

function dedupeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
}

function pushUnique(list: WhatsNextSuggestion[], seen: Set<string>, item: WhatsNextSuggestion) {
  const key = dedupeKey(item.title);
  if (seen.has(key)) return;
  seen.add(key);
  list.push(item);
}

function godModeSuggestion(idea: GodModeIdea): WhatsNextSuggestion {
  return {
    id: idea.id,
    title: idea.question,
    detail: idea.insight,
    source: "god-mode",
    buildIntent: `${idea.insight} — ship the smallest slice that proves value. Minimal diff. Match existing patterns.`,
    leverage: idea.leverage,
  };
}

function backlogSuggestion(title: string, detail: string, source: WhatsNextSource): WhatsNextSuggestion {
  return {
    id: `backlog-${dedupeKey(title).replace(/\W/g, "-")}`,
    title,
    detail,
    source,
    buildIntent: `Add or finish: ${title}. ${detail}`.trim(),
  };
}

export interface WhatsNextOptions {
  openProblemCount?: number;
}

/** Ordered queue for Work page — God Mode first when build is healthy, backlog when blocked. */
export function buildWhatsNextSuggestions(
  project: Project,
  brief: ProjectBrief | null,
  options: WhatsNextOptions = {},
): WhatsNextSuggestion[] {
  const ops = project.ops;
  const openProblems = options.openProblemCount ?? ops.errors.filter((e) => !e.resolved).length + ops.blockers.length;
  const list: WhatsNextSuggestion[] = [];
  const seen = new Set<string>();

  if (openProblems > 0) {
    pushUnique(
      list,
      seen,
      backlogSuggestion(
        "Clear open problems first",
        "Run Fix errors → paste in Cursor → Check again. Then pick the next God Mode add-on.",
        "prompt",
      ),
    );
  }

  if (ops.nextAction?.recommendedPrompt?.trim()) {
    pushUnique(list, seen, {
      id: "next-action",
      title: ops.nextAction.title,
      detail: [ops.nextAction.whyItMatters, ops.nextAction.unresolvedIssue].filter(Boolean).join(" — "),
      source: "next-action",
      buildIntent: ops.nextAction.recommendedPrompt.trim(),
    });
  }

  for (const idea of ops.godModeIdeas) {
    pushUnique(list, seen, godModeSuggestion(idea));
  }

  for (const item of brief?.stillNeed ?? []) {
    pushUnique(list, seen, backlogSuggestion(item, "From live scan — still missing on disk.", "gap"));
  }

  for (const item of ops.whatsNext) {
    pushUnique(list, seen, backlogSuggestion(item, "On your build queue.", "backlog"));
  }

  for (const item of brief?.needsBuild ?? []) {
    pushUnique(list, seen, backlogSuggestion(item, "Planned work — not built yet.", "backlog"));
  }

  for (const item of ops.missingPieces ?? []) {
    pushUnique(list, seen, backlogSuggestion(item, "Missing piece before ship.", "gap"));
  }

  if (list.length === 0 || list.every((s) => s.source === "prompt")) {
    pushUnique(list, seen, {
      id: "help-decide",
      title: "Where should we go next?",
      detail: "Tell Jeff OS what outcome you want — or pick a God Mode add-on above.",
      source: "prompt",
      buildIntent: "",
    });
  }

  return list;
}

export function pickWhatsNextSuggestion(
  suggestions: WhatsNextSuggestion[],
  index: number,
): WhatsNextSuggestion {
  if (suggestions.length === 0) {
    return {
      id: "empty",
      title: "Where should we go next?",
      detail: "Set mission in Settings or describe what you want in Add to project.",
      source: "prompt",
      buildIntent: "",
    };
  }
  const i = ((index % suggestions.length) + suggestions.length) % suggestions.length;
  return suggestions[i]!;
}
