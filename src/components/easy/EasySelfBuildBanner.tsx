"use client";

import type { Project } from "@/lib/types";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";

export const JEFF_OS_PROJECT_ID = "proj-jeff-os";

export function isJeffOsProject(project: Pick<Project, "id">): boolean {
  return project.id === JEFF_OS_PROJECT_ID;
}

export function EasySelfBuildBanner({
  project,
  verifyReport,
  liveGapCount,
  onVerify,
  onOpenGaps,
}: {
  project: Project;
  verifyReport: VerifyReport | null;
  liveGapCount: number;
  onVerify: () => void;
  onOpenGaps: () => void;
}) {
  if (!isJeffOsProject(project)) return null;

  const verified = verifyReport?.canAdvance ?? project.ops.liveVerify?.canAdvance;
  const buildPassed = verifyReport?.buildPassed ?? project.ops.liveVerify?.buildPassed;

  return (
    <section className="mb-4 space-y-3 rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
        Self-build mode — you are editing this app right now
      </p>
      <p className="text-sm text-zinc-300">
        Code lives in{" "}
        <span className="font-mono text-[11px] text-violet-200">{project.path}</span>. Docs live in{" "}
        <span className="font-mono text-[11px] text-zinc-500">AI-COMMAND-CENTER</span> — different folder.
      </p>

      <ol className="space-y-1.5 text-sm text-zinc-400">
        <li>1. Edit in Cursor → browser hot reloads</li>
        <li>2. <strong className="text-zinc-200">Rescan + verify build</strong> — honest truth (runs npm run build here)</li>
        <li>3. Yellow gaps? → copy GAP prompt → paste in Cursor</li>
        <li>4. Ship panel below → Git push + optional Vercel</li>
      </ol>

      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
        Dev server running? Verify usually still works. If build fights .next — stop dev, verify, restart dev.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onVerify}
          className="rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-400"
        >
          Rescan + verify build
        </button>
        {liveGapCount > 0 && (
          <button
            type="button"
            onClick={onOpenGaps}
            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200"
          >
            {liveGapCount} gaps → fix
          </button>
        )}
        <a
          href="#ship-panel"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-indigo-300"
        >
          Jump to ship ↓
        </a>
      </div>

      {verified && (
        <p className="text-xs text-emerald-400">Build verified — safe to ship when git is clean.</p>
      )}
      {buildPassed === false && verifyReport && (
        <p className="text-xs text-rose-400">Last verify failed — fix errors panel first.</p>
      )}
    </section>
  );
}
