import type { Project } from "@/lib/types";

export const JEFF_OS_PROJECT_ID = "proj-jeff-os";
export const JEFF_OS_GITHUB = "https://github.com/jpro99/JeffOS";

export function isJeffOsProject(project: Pick<Project, "id">): boolean {
  return project.id === JEFF_OS_PROJECT_ID;
}
