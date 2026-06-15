"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { computeJourneyPhase, type JourneyPhase } from "@/lib/mission/project-journey";
import { ProjectJourneyRail } from "@/components/journey/ProjectJourneyRail";
import { JourneyActivePanel } from "@/components/journey/JourneyActivePanel";

interface ProjectJourneyFlowProps {
  project: Project;
  onRefresh?: () => void;
}

export function ProjectJourneyFlow({ project, onRefresh }: ProjectJourneyFlowProps) {
  const { state } = useMissionControl();
  const autoPhase = useMemo(() => computeJourneyPhase(project), [project]);
  const [phase, setPhase] = useState<JourneyPhase>(autoPhase);
  const [primaryBusy, setPrimaryBusy] = useState(false);

  const live = state.projects.find((p) => p.id === project.id) ?? project;

  useEffect(() => {
    setPhase(computeJourneyPhase(live));
  }, [live.path, live.pathExists, live.ops.errors.length, live.orchestration?.plan?.approved]);

  const handlePrimary = useCallback(async () => {
    setPrimaryBusy(true);
    try {
      if (phase === "folder") {
        document.getElementById("journey-create-folder")?.click();
      } else if (phase === "connect") {
        window.open("https://github.com/signup", "_blank");
      } else if (phase === "build") {
        document.getElementById("journey-open-cursor")?.click();
      } else if (phase === "fix") {
        document.getElementById("journey-fix-next")?.click();
      } else if (phase === "ship") {
        document.getElementById("ship-panel")?.scrollIntoView({ behavior: "smooth" });
      } else if (phase === "done") {
        document.getElementById("journey-brainstorm")?.scrollIntoView({ behavior: "smooth" });
      }
    } finally {
      setPrimaryBusy(false);
    }
  }, [phase]);

  const advanceAfterFolder = () => {
    setPhase("connect");
  };

  return (
    <div className="space-y-4">
      <ProjectJourneyRail
        project={live}
        phase={phase}
        onPhaseChange={setPhase}
        onPrimaryAction={() => void handlePrimary()}
        primaryBusy={primaryBusy}
      />
      <JourneyActivePanel
        project={live}
        phase={phase}
        onFolderCreated={advanceAfterFolder}
        onRefresh={onRefresh}
      />
    </div>
  );
}
