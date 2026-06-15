import type { Project } from "@/lib/types";
import { DEFAULT_PROJECTS_ROOT } from "@/lib/discovery/catalog";
import { resolveProjectPath, mkdirShellCommand } from "@/lib/mission/project-location";

export type BuildPrerequisiteKind = "ready" | "needs-folder" | "needs-import";

export interface BuildPrerequisites {
  kind: BuildPrerequisiteKind;
  title: string;
  steps: string[];
  shellCommand?: string;
  suggestedPath?: string;
}

/** Where greenfield apps usually live on Jeff's PC */
export function suggestProjectFolder(project: Pick<Project, "name" | "slug" | "path">): string {
  if (project.path?.trim()) return project.path.trim();
  return resolveProjectPath(DEFAULT_PROJECTS_ROOT, project.name);
}

export function getBuildPrerequisites(project: Project): BuildPrerequisites {
  const folder = project.path?.trim();
  const suggested = suggestProjectFolder(project);

  if (folder && project.pathExists !== false) {
    return {
      kind: "ready",
      title: "Folder ready — Cursor builds the files for you",
      steps: [
        `Open Cursor on this folder: ${folder}`,
        "Paste the whole prompt box below into Cursor agent chat (new chat is fine).",
        "Cursor reads the prompt and creates/edits code on disk — you do not build files by hand first.",
        "When the agent finishes, come back to Jeff OS → Rescan + verify.",
      ],
      suggestedPath: folder,
    };
  }

  if (folder && project.pathExists === false) {
    return {
      kind: "needs-folder",
      title: "Folder path set but not found on disk yet",
      steps: [
        `Run the command below to create the folder and open Cursor — OR paste the prompt and let Step 1 scaffold it.`,
        "Then paste the prompt below in agent chat.",
      ],
      shellCommand: mkdirShellCommand(folder),
      suggestedPath: folder,
    };
  }

  return {
    kind: "needs-folder",
    title: "No project folder yet — create one first (one command)",
    steps: [
      "Jeff OS cannot create files from the browser. Cursor will build everything after you paste.",
      "Run this in PowerShell once (creates folder + opens Cursor):",
      "Paste the prompt below in Cursor agent chat — it includes scaffold + all bot steps.",
      `After build, in Jeff OS: set project path to ${suggested} or Import from disk.`,
    ],
    shellCommand: mkdirShellCommand(suggested),
    suggestedPath: suggested,
  };
}

/** Extra block appended to prompts for brand-new apps with no disk path */
export function greenfieldScaffoldBlock(project: Project): string {
  if (project.path?.trim() && project.pathExists !== false) return "";

  const target = project.path?.trim() || suggestProjectFolder(project);
  return `
═══════════════════════════════════════
STEP 0 — SCAFFOLD (no repo on disk yet)
═══════════════════════════════════════
Create project folder if missing: ${target}
- mkdir parent dirs as needed
- git init, README, .gitignore
- Scaffold stack from scope (Next.js etc.) per Jeff OS tech preferences
- npm install && npm run build must pass before feature work
Then continue bot steps below IN ORDER.

`;
}
