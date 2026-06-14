"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";
import { EasyProjectMission } from "@/components/easy/EasyProjectMission";

function MissionLoader({ id }: { id: string }) {
  const { state } = useMissionControl();
  const project = state.projects.find((p) => p.id === id);
  if (!project) notFound();
  return <EasyProjectMission project={project} />;
}

export default function EasyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MissionLoader id={id} />;
}
