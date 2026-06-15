"use client";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import type { Project } from "@/lib/types";

export function EasyProjectPageGate({
  id,
  children,
}: {
  id: string;
  children: (project: Project) => ReactNode;
}) {
  const { hydrated, getProject } = useMissionControl();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-zinc-500">Loading project…</div>
    );
  }

  const project = getProject(id);
  if (!project) notFound();

  return <>{children(project)}</>;
}
