"use client";

import type { Project } from "@/lib/types";
import { ProjectFolderBanner } from "@/components/shared/ProjectFolderBanner";
import { PasteFixPanel } from "@/components/shared/PasteFixPanel";
import { LocalCommandTerminal } from "@/components/shared/LocalCommandTerminal";

/** Folder truth + paste problems — always on every project */
export function ProjectFixHub({
  project,
  initialPaste,
  compact,
}: {
  project: Project;
  initialPaste?: string;
  compact?: boolean;
}) {
  return (
    <div id="project-fix-hub" className="space-y-4">
      <ProjectFolderBanner project={project} />
      <PasteFixPanel project={project} initialPaste={initialPaste} compact={compact} />
      <LocalCommandTerminal project={project} />
    </div>
  );
}
