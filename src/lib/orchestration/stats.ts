import type { Project, ProjectOrchestration } from "@/lib/types";

export interface OrchestrationStats {
  total: number;
  done: number;
  building: number;
  testing: number;
  securityReview: number;
  blocked: number;
  planning: number;
  securityScore: number;
  planningStatus: ProjectOrchestration["planningStatus"];
  planApproved: boolean;
}

export function getOrchestrationStats(project: Project): OrchestrationStats {
  const orch = project.orchestration;
  const features = orch?.features ?? [];

  return {
    total: features.length,
    done: features.filter((f) => f.status === "done").length,
    building: features.filter((f) => f.status === "building").length,
    testing: features.filter((f) => f.status === "testing").length,
    securityReview: features.filter((f) => f.status === "security-review").length,
    blocked: features.filter((f) => f.status === "blocked").length,
    planning: features.filter((f) => ["idea", "planning", "not-built"].includes(f.status)).length,
    securityScore: orch?.securityScore ?? project.ops.security.score,
    planningStatus: orch?.planningStatus ?? "draft",
    planApproved: orch?.plan?.approved ?? false,
  };
}

export const FEATURE_STATUS_LABELS: Record<string, string> = {
  idea: "Idea",
  "not-built": "Not built",
  planning: "Planning",
  building: "Building",
  testing: "Testing",
  "security-review": "Security review",
  done: "Done",
  blocked: "Blocked",
};

export const FEATURE_STATUS_COLORS: Record<string, string> = {
  idea: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  "not-built": "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  planning: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  building: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  testing: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "security-review": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  done: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  blocked: "text-rose-400 bg-rose-500/15 border-rose-500/30",
};

export const STEP_STATUS_COLORS: Record<string, string> = {
  planned: "text-zinc-500",
  building: "text-amber-400",
  done: "text-emerald-400",
  skipped: "text-zinc-600",
};
