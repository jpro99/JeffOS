import type { Project, ProjectError, QuickCommandId } from "@/lib/types";
import type { QuickCommandResult } from "@/lib/intelligence/commands";

export interface QuickActionStep {
  n: number;
  title: string;
  detail: string;
  action?: "copy" | "cursor" | "paste-fix" | "terminal" | "errors-tab";
}

export interface QuickActionGuide {
  headline: string;
  summary: string;
  steps: QuickActionStep[];
  errors: ProjectError[];
  blockers: string[];
  suggestedTerminalCommand?: string;
  promptLabel: string;
}

function openErrors(errors: ProjectError[]): ProjectError[] {
  return errors.filter((e) => !e.resolved);
}

export function errorsToPasteText(errors: ProjectError[]): string {
  const open = openErrors(errors);
  if (open.length === 0) return "";
  return open
    .map(
      (e, i) =>
        `Issue ${i + 1}: ${e.title}\nLikely cause: ${e.likelyCause}\nRecommended fix: ${e.recommendedFix}\nAbout to do: ${e.aboutToDo}`,
    )
    .join("\n\n---\n\n");
}

export function buildQuickActionGuide(
  commandId: QuickCommandId,
  project: Project,
  result: QuickCommandResult,
): QuickActionGuide {
  const ops = project.ops;
  const na = ops.nextAction;
  const errors = openErrors(ops.errors);
  const blockers = ops.blockers;

  const basePromptLabel = "Cursor prompt — paste in agent chat on your project folder";

  switch (commandId) {
    case "what-to-do":
    case "next-step":
      return {
        headline: "Show me what to do next",
        summary: "You do not need to know code. Follow these steps in order.",
        promptLabel: basePromptLabel,
        errors,
        blockers,
        steps: [
          {
            n: 1,
            title: "Your next move",
            detail: `${na.title}. ${na.whyItMatters}`,
          },
          {
            n: 2,
            title: "Open Cursor on this project",
            detail: project.path
              ? `Folder: ${project.path}. Jeff OS can open it for you.`
              : "Set your project folder first (banner above), then open in Cursor.",
            action: "cursor",
          },
          {
            n: 3,
            title: "Paste the prompt below into Cursor",
            detail: "Cursor agent writes the code on your PC. Jeff OS only plans — it cannot type into Cursor for you.",
            action: "copy",
          },
          {
            n: 4,
            title: "When Cursor says it is done",
            detail: "Come back here and click Re-check disk, or rescan. Mark checklist steps done if you see them.",
          },
        ],
      };

    case "fix-errors":
    case "fix-next-issue":
    case "review-errors":
      return {
        headline: errors.length ? `Fix ${errors.length} issue${errors.length === 1 ? "" : "s"}` : "Check for errors",
        summary: errors.length
          ? "These are the problems Jeff OS knows about. Fix them one at a time."
          : "No tracked errors yet — run a build to find real failures.",
        promptLabel: "Cursor fix prompt",
        errors,
        blockers,
        suggestedTerminalCommand: "npm run build",
        steps: errors.length
          ? [
              { n: 1, title: "Read the issues below", detail: "Each card says what is wrong and what to do." },
              {
                n: 2,
                title: "Run build in the terminal (localhost)",
                detail: "Shows real compiler errors from your project folder.",
                action: "terminal",
              },
              {
                n: 3,
                title: "Paste output into Paste & fix",
                detail: "Jeff OS turns logs into run commands + a Cursor fix prompt.",
                action: "paste-fix",
              },
              {
                n: 4,
                title: "Or copy the fix prompt to Cursor",
                detail: result.plainEnglish,
                action: "copy",
              },
            ]
          : [
              {
                n: 1,
                title: "Run npm run build in the terminal below",
                detail: "Finds TypeScript and compile errors on disk.",
                action: "terminal",
              },
              {
                n: 2,
                title: "Paste the output into Paste & fix",
                detail: "Rose box at top of this page.",
                action: "paste-fix",
              },
              {
                n: 3,
                title: "Copy the generated Cursor prompt",
                detail: "Paste in Cursor agent — it fixes files for you.",
                action: "copy",
              },
            ],
      };

    case "continue-build":
    case "continue-coding":
    case "build-fast":
      return {
        headline: "Continue building",
        summary: "Pick up where you left off — same flow every time.",
        promptLabel: basePromptLabel,
        errors,
        blockers,
        steps: [
          { n: 1, title: "Goal", detail: `${na.title} — ${na.whyItMatters}` },
          { n: 2, title: "Open Cursor", detail: "Use your project folder.", action: "cursor" },
          { n: 3, title: "Paste prompt", detail: "Agent continues the build.", action: "copy" },
        ],
      };

    case "generate-prompt":
    case "route-task":
      return {
        headline: "Best prompt for this task",
        summary: result.plainEnglish,
        promptLabel: "Generated prompt",
        errors,
        blockers,
        steps: [
          { n: 1, title: "Copy the prompt below", detail: "Tuned for routing and task type.", action: "copy" },
          { n: 2, title: "Paste in Cursor", detail: `Route: ${result.routing.interface} / ${result.routing.modelClass}`, action: "cursor" },
        ],
      };

    case "god-mode":
    case "ultimate-mode":
      return {
        headline: "God Mode — think bigger",
        summary: "Strategy session, not code yet.",
        promptLabel: "God Mode prompt",
        errors,
        blockers,
        steps: ops.godModeIdeas.slice(0, 3).map((g, i) => ({
          n: i + 1,
          title: g.question,
          detail: g.insight,
        })),
      };

    default:
      return {
        headline: result.label,
        summary: result.plainEnglish,
        promptLabel: basePromptLabel,
        errors,
        blockers,
        steps: [
          { n: 1, title: na.title, detail: na.whyItMatters },
          { n: 2, title: "Copy prompt → Cursor", detail: "Standard Jeff OS flow.", action: "copy" },
        ],
      };
  }
}

export function dispatchPasteFixSeed(text: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("jeff-set-paste-fix", { detail: text }));
}

export function scrollToLocalTerminal() {
  document.getElementById("local-command-terminal")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function scrollToPasteFix() {
  document.getElementById("paste-fix-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
