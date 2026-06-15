"use client";

import Link from "next/link";
import type { FolderScan } from "@/lib/project-scan/analyze";
import type { Project } from "@/lib/types";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";
import { cn } from "@/lib/utils";

import { isJeffOsProject, JEFF_OS_GITHUB, JEFF_OS_PROJECT_ID } from "@/lib/projects/jeff-os";

export { JEFF_OS_GITHUB, JEFF_OS_PROJECT_ID, isJeffOsProject };

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
        ok
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
          : "bg-zinc-500/10 text-zinc-500 ring-white/10",
      )}
    >
      {ok ? "✓ " : "○ "}
      {label}
    </span>
  );
}

const STEPS = [
  { n: 1, title: "Edit in Cursor", body: "Hot reload at localhost:3000" },
  { n: 2, title: "Rescan + verify", body: "Honest npm run build on disk" },
  { n: 3, title: "Close gaps", body: "Yellow pill → GAP prompt → Cursor" },
  { n: 4, title: "Push + Vercel", body: "GitHub JeffOS → Vercel auto-builds" },
];

export function EasySelfBuildBanner({
  project,
  verifyReport,
  liveGapCount,
  scan,
  onVerify,
  onOpenGaps,
}: {
  project: Project;
  verifyReport: VerifyReport | null;
  liveGapCount: number;
  scan?: FolderScan | null;
  onVerify: () => void;
  onOpenGaps: () => void;
}) {
  if (!isJeffOsProject(project)) return null;

  const verified = verifyReport?.canAdvance ?? project.ops.liveVerify?.canAdvance;
  const buildPassed = verifyReport?.buildPassed ?? project.ops.liveVerify?.buildPassed;
  const hasGit = scan?.hasGit ?? false;
  const hasCi = scan?.signals.some((s) => /github ci/i.test(s)) ?? false;
  const hasVercelConfig = scan?.signals.some((s) => /vercel config/i.test(s)) ?? false;
  const vercelLinked = scan?.vercelLinked ?? false;
  const ghUrl = project.connections?.find((c) => c.kind === "github")?.url ?? JEFF_OS_GITHUB;

  return (
    <section className="mb-4 space-y-4 rounded-2xl border border-violet-500/30 bg-gradient-to-b from-violet-500/[0.08] to-violet-500/[0.02] p-5 shadow-lg shadow-black/20">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
          Self-build mode — you are editing this app right now
        </p>
        <p className="mt-2 text-sm text-zinc-300">
          Code:{" "}
          <span className="font-mono text-[11px] text-violet-200">{project.path}</span>
          <span className="text-zinc-600"> · Docs: </span>
          <span className="font-mono text-[11px] text-zinc-500">AI-COMMAND-CENTER</span>
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-200">
              {step.n}
            </span>
            <div>
              <p className="text-xs font-semibold text-zinc-200">{step.title}</p>
              <p className="text-[11px] text-zinc-500">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      {scan && (
        <div className="flex flex-wrap gap-1.5">
          <StatusPill ok={hasGit} label="Git repo" />
          <StatusPill ok={hasCi} label="GitHub CI" />
          <StatusPill ok={hasVercelConfig} label="vercel.json" />
          <StatusPill ok={vercelLinked} label="Vercel linked" />
          <StatusPill ok={!!verified} label="Build verified" />
        </div>
      )}

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
        <Link
          href="/easy#builder-hub"
          className="rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs text-teal-200 hover:bg-teal-500/20"
        >
          Builder Hub ↑
        </Link>
        <a
          href="#ship-panel"
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 hover:text-indigo-300"
        >
          Ship panel ↓
        </a>
      </div>

      <details className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] px-4 py-3 text-xs text-zinc-500">
        <summary className="cursor-pointer font-medium text-indigo-300 hover:text-indigo-200">
          Optional Vercel deploy (JeffOS repo)
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-zinc-400">
          <li>
            GitHub:{" "}
            <a href={ghUrl} target="_blank" rel="noreferrer" className="text-teal-500 hover:underline">
              {ghUrl.replace("https://", "")}
            </a>
          </li>
          <li>Vercel → Import → pick <strong className="text-zinc-300">JeffOS</strong></li>
          <li>Root Directory: <strong className="text-zinc-300">.</strong> (repo root — not a subfolder)</li>
          <li>Framework: Next.js · Deploy</li>
          <li>Push to main → CI runs · Vercel builds on push</li>
        </ol>
      </details>

      {verified && (
        <p className="text-xs text-emerald-400">Build verified — safe to ship when git is clean.</p>
      )}
      {buildPassed === false && verifyReport && (
        <p className="text-xs text-rose-400">Last verify failed — fix errors panel first.</p>
      )}
    </section>
  );
}
