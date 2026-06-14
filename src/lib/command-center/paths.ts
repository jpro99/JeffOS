import path from "path";
import type { Project } from "@/lib/types";
import { PROJECT_CATALOG } from "@/lib/discovery/catalog";

export const COMMAND_CENTER_ROOT = path.normalize(
  "C:\\Projects\\Project Command\\AI-COMMAND-CENTER",
);

/** Relative paths safe to read in the UI */
export const READABLE_DOCS = [
  "CONTROL_TOWER.md",
  "PROJECT_INDEX.md",
  "WORKER_BOTS.md",
  "SETUP_GUIDE.md",
  "PROJECT_GOD_BOT_TEMPLATE.md",
] as const;

export function resolveGodBotRelativePath(project: Pick<Project, "slug" | "godBotFile">): string {
  if (project.godBotFile) return project.godBotFile.replace(/\\/g, "/");
  const catalog = PROJECT_CATALOG.find((e) => e.slug === project.slug);
  if (catalog?.godBotFile) return catalog.godBotFile;
  return `projects/${project.slug}.md`;
}

export function resolveAddonsRelativePath(project: Pick<Project, "slug">): string {
  return `projects/${project.slug}-addons.md`;
}

export function toAbsolute(relativePath: string): string {
  return path.normalize(path.join(COMMAND_CENTER_ROOT, relativePath.replace(/\//g, path.sep)));
}

export function isUnderCommandCenter(absolutePath: string): boolean {
  const root = COMMAND_CENTER_ROOT.toLowerCase();
  const normalized = path.normalize(absolutePath).toLowerCase();
  return normalized.startsWith(root);
}

export function isSafeRelative(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  if (READABLE_DOCS.includes(normalized as (typeof READABLE_DOCS)[number])) return true;
  if (/^projects\/[a-z0-9-]+\.md$/i.test(normalized)) return true;
  if (/^projects\/[a-z0-9-]+-addons\.md$/i.test(normalized)) return true;
  return false;
}

export function isWritableRelative(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  return /^projects\/[a-z0-9-]+(-addons)?\.md$/i.test(normalized);
}

export function enrichProjectGodBotFile(project: Project): Project {
  if (project.godBotFile) return project;
  const catalog = PROJECT_CATALOG.find((e) => e.id === project.id || e.slug === project.slug);
  if (catalog?.godBotFile) return { ...project, godBotFile: catalog.godBotFile };
  return { ...project, godBotFile: `projects/${project.slug}.md` };
}
