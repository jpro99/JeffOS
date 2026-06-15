import type { Project } from "@/lib/types";
import { sumProjectCost } from "@/lib/connections/helpers";

export interface CostBreakdownLine {
  id: string;
  label: string;
  kind: string;
  amountUsd: number;
  billingSource: "manual" | "estimated" | "api";
  dashboardUrl?: string;
  description?: string;
}

export interface ProjectCostBreakdown {
  projectId: string;
  projectName: string;
  totalUsd: number;
  lines: CostBreakdownLine[];
  /** Plain English — not a live invoice */
  honesty: string;
  /** Shared accounts across apps */
  sharedNote: string;
  formula: string;
}

export function buildProjectCostBreakdown(project: Project): ProjectCostBreakdown {
  const connections = project.connections ?? [];
  const lines: CostBreakdownLine[] = connections
    .filter((c) => c.estimatedMonthlyUsd > 0)
    .map((c) => ({
      id: c.id,
      label: c.name,
      kind: c.kind,
      amountUsd: c.estimatedMonthlyUsd,
      billingSource: c.billingSource ?? "estimated",
      dashboardUrl: c.dashboardUrl ?? (c.url.startsWith("http") ? c.url : undefined),
      description: c.description,
    }))
    .sort((a, b) => b.amountUsd - a.amountUsd);

  const totalUsd = sumProjectCost(project);
  const parts = lines.map((l) => `${l.label} $${l.amountUsd.toFixed(0)}`);
  const formula = parts.length ? parts.join(" + ") + ` = $${totalUsd.toFixed(0)}` : "$0";

  const hasManual = lines.some((l) => l.billingSource === "manual");
  const hasApi = lines.some((l) => l.billingSource === "api");

  let honesty =
    "Planning estimate from Jeff OS catalog — not pulled from your bank or Vercel invoice.";
  if (hasApi) honesty = "Mix of live API pulls and catalog estimates — confirm on each dashboard.";
  if (hasManual) honesty = "You edited some line items — still check real bills monthly.";

  return {
    projectId: project.id,
    projectName: project.name,
    totalUsd,
    lines,
    honesty,
    sharedNote:
      "Same Vercel or OpenAI account on many apps? Real bill is once — Jeff OS shows per-app stack so you see what each project uses. Portfolio totals can look higher than your statement.",
    formula,
  };
}

/** Demand Generator sanity: catalog lines should sum to displayed total */
export function formatBreakdownSummary(b: ProjectCostBreakdown): string {
  if (b.lines.length === 0) return `${b.projectName}: no cost lines yet.`;
  return `${b.projectName}: est. $${b.totalUsd.toFixed(0)}/mo = ${b.formula.replace(/ = .+$/, "")} (catalog)`;
}
