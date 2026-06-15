"use client";

import { use } from "react";
import { EasyProjectPageGate } from "@/components/easy/EasyProjectPageGate";
import { EasyProjectMission } from "@/components/easy/EasyProjectMission";

export default function EasyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <EasyProjectPageGate id={id}>
      {(project) => <EasyProjectMission project={project} />}
    </EasyProjectPageGate>
  );
}
