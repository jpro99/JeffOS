"use client";

import { Suspense, use } from "react";
import { notFound } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import { ProjectWorkspace } from "@/components/workspace/ProjectWorkspace";

function ProjectWorkspaceLoader({ id }: { id: string }) {
  const { state } = useMissionControl();
  const project = state.projects.find((p) => p.id === id);
  if (!project) notFound();
  return <ProjectWorkspace project={project} />;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading workspace…</div>}>
      <ProjectWorkspaceLoader id={id} />
    </Suspense>
  );
}
