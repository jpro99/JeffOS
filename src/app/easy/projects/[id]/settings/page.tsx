"use client";

import { use } from "react";
import { EasyProjectPageGate } from "@/components/easy/EasyProjectPageGate";
import { EasyProjectSettings } from "@/components/easy/EasyProjectSettings";

export default function EasyProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <EasyProjectPageGate id={id}>
      {(project) => <EasyProjectSettings project={project} />}
    </EasyProjectPageGate>
  );
}
