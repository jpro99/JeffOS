import type { Project } from "@/lib/types";
import { PROJECT_CATALOG } from "@/lib/discovery/catalog";

export function resolveGodBotRelativePath(project: Pick<Project, "slug" | "godBotFile">): string {
  if (project.godBotFile) return project.godBotFile.replace(/\\/g, "/");
  const catalog = PROJECT_CATALOG.find((e) => e.slug === project.slug);
  if (catalog?.godBotFile) return catalog.godBotFile;
  return `projects/${project.slug}.md`;
}

export function resolveAddonsRelativePath(project: Pick<Project, "slug">): string {
  return `projects/${project.slug}-addons.md`;
}

export function enrichProjectGodBotFile(project: Project): Project {
  if (project.godBotFile) return project;
  const catalog = PROJECT_CATALOG.find((e) => e.id === project.id || e.slug === project.slug);
  if (catalog?.godBotFile) return { ...project, godBotFile: catalog.godBotFile };
  return { ...project, godBotFile: `projects/${project.slug}.md` };
}
