import type { MissionControlState, Project } from "@/lib/types";

export interface PortfolioProjectRow {
  id: string;
  name: string;
  priority: string;
  verified: boolean;
  buildPassed: boolean;
  gapSignal: number;
  nextTitle: string;
  path?: string;
}

export interface PortfolioPulse {
  total: number;
  verified: number;
  needsVerify: number;
  gapProjects: number;
  shipReady: number;
  rows: PortfolioProjectRow[];
}

export function gapSignalCount(project: Project): number {
  const ops = project.ops;
  return (
    ops.blockers.length +
    ops.missingPieces.length +
    ops.whatsNext.length +
    ops.hardeningSteps.length +
    ops.errors.filter((e) => !e.resolved).length
  );
}

export function summarizePortfolio(state: MissionControlState): PortfolioPulse {
  const rows: PortfolioProjectRow[] = state.projects.map((p) => {
    const verified = p.ops.liveVerify?.canAdvance === true;
    const buildPassed = p.ops.liveVerify?.buildPassed === true;
    const gaps = gapSignalCount(p);
    return {
      id: p.id,
      name: p.name,
      priority: p.priority,
      verified,
      buildPassed,
      gapSignal: gaps,
      nextTitle: p.ops.nextAction?.title ?? "Tell Builder what you need",
      path: p.path,
    };
  });

  rows.sort((a, b) => {
    const po: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return (po[a.priority] ?? 9) - (po[b.priority] ?? 9);
  });

  return {
    total: rows.length,
    verified: rows.filter((r) => r.verified).length,
    needsVerify: rows.filter((r) => !r.buildPassed && !r.verified).length,
    gapProjects: rows.filter((r) => r.gapSignal > 0).length,
    shipReady: rows.filter((r) => r.verified).length,
    rows,
  };
}

export function isOneDaySprintIntent(text: string): boolean {
  return /\b(one day|one-day|1 day|everything in a day|bots build|compared to a long time|keeping track|ease of building|new projects|best program|pushing and having bots)\b/i.test(
    text,
  );
}

export function formatOneDaySprintBlock(state: MissionControlState): string {
  const pulse = summarizePortfolio(state);
  const lines = pulse.rows
    .slice(0, 10)
    .map(
      (r) =>
        `- ${r.name}: ${r.verified ? "✓ ship-ready" : r.buildPassed ? "build ok" : "verify?"} · gaps~${r.gapSignal} · ${r.nextTitle.slice(0, 60)}`,
    )
    .join("\n");

  return `
═══════════════════════════════════════
ONE-DAY SPRINT — bots ship fast, not weeks
═══════════════════════════════════════
Jeff wants one day vs long time. Rules for Cursor:
- Minimal diff · match repo · npm run build before done
- Run bot steps IN ORDER but keep each step short (caveman)
- Parallel only when files don't clash
- End of day: verify green → git push → Vercel if ready

Portfolio (${pulse.total} projects · ${pulse.verified} verified · ${pulse.gapProjects} with backlog):
${lines || "- Import projects first"}

New greenfield: scaffold → verify → ship same session if small.
`;
}
