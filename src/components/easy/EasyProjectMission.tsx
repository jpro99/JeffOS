"use client";

import { EasyProjectCockpit } from "@/components/easy/EasyProjectCockpit";
import type { Project } from "@/lib/types";

export function EasyProjectMission({ project }: { project: Project }) {
  return <EasyProjectCockpit project={project} />;
}
