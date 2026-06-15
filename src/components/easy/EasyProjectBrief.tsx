"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import type { ProjectBrief } from "@/lib/project-scan/brief";
import type { FolderScan } from "@/lib/project-scan/analyze";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";
import { useMissionControl } from "@/lib/store/context";
import { cn } from "@/lib/utils";
import type { ConnectionInventoryItem } from "@/lib/connections/inventory";
import { EasyConnectionsInventory } from "@/components/easy/EasyConnectionsInventory";
import { EasyErrorFixPanel } from "@/components/easy/EasyErrorFixPanel";
import { EasyGapsPanel, OperationalStatusButton } from "@/components/easy/EasyGapsPanel";
import { EasySelfBuildBanner } from "@/components/easy/EasySelfBuildBanner";
import { EasyCostBreakdown } from "@/components/easy/EasyCostBreakdown";
import { PasteFixPanel } from "@/components/shared/PasteFixPanel";

const statusColors: Record<string, string> = {
  operational: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  partial: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  building: "bg-teal-500/15 text-teal-200 ring-teal-500/25",
  "not-built": "bg-zinc-500/15 text-zinc-400 ring-zinc-500/25",
  blocked: "bg-rose-500/15 text-rose-300 ring-rose-500/25",
};

function BulletList({
  items,
  empty,
  variant = "neutral",
}: {
  items: string[];
  empty: string;
  variant?: "good" | "warn" | "neutral";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-600">{empty}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "text-sm",
            variant === "good" && "text-emerald-300/90",
            variant === "warn" && "text-amber-200/90",
            variant === "neutral" && "text-zinc-400",
          )}
        >
          · {item}
        </li>
      ))}
    </ul>
  );
}

interface EasyProjectBriefProps {
  project: Project;
  onScanComplete?: (brief: ProjectBrief) => void;
  onFixComplete?: () => void;
}

export function EasyProjectBrief({ project, onScanComplete, onFixComplete }: EasyProjectBriefProps) {
  const { updateProject } = useMissionControl();
  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [inventory, setInventory] = useState<ConnectionInventoryItem[]>([]);
  const [scan, setScan] = useState<FolderScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [gapsOpen, setGapsOpen] = useState(false);
  const [verifyReport, setVerifyReport] = useState<VerifyReport | null>(null);
  const [scanMode, setScanMode] = useState<"quick" | "verify">("quick");
  const [pasteSeed, setPasteSeed] = useState("");
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const scrollToFix = () => {
    setFixOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("fix-errors-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const scrollToGaps = () => {
    setGapsOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("gaps-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const runScan = useCallback(
    async (withVerify = false) => {
      setLoading(true);
      setScanMode(withVerify ? "verify" : "quick");
      setErr(null);
      if (withVerify) setVerifyReport(null);

      const timeoutMs = withVerify ? 200_000 : 20_000;
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch("/api/projects/scan-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: projectRef.current, verify: withVerify }),
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          ok: boolean;
          brief?: ProjectBrief;
          scan?: FolderScan;
          inventory?: ConnectionInventoryItem[];
          updatedOps?: Project["ops"];
          report?: VerifyReport;
          error?: string;
        };
        const live = projectRef.current;
        if (data.updatedOps) {
          updateProject({ ...live, ops: data.updatedOps });
        }
        if (data.report) setVerifyReport(data.report);
        if (data.brief) {
          setBrief(data.brief);
          onScanComplete?.(data.brief);
        }
        if (data.inventory) setInventory(data.inventory);
        if (data.scan) setScan(data.scan);
        if (!data.ok && data.error) setErr(data.error);
      } catch (e) {
        const aborted = e instanceof Error && e.name === "AbortError";
        setErr(
          aborted
            ? withVerify
              ? "Build verify timed out (3 min) — try again or run npm run build in project folder"
              : "Scan timed out — is npm run dev running on localhost:3000?"
            : "Run npm run dev locally to scan folders",
        );
      } finally {
        window.clearTimeout(timer);
        setLoading(false);
      }
    },
    [onScanComplete, updateProject],
  );

  const runScanRef = useRef(runScan);

  useEffect(() => {
    runScanRef.current = runScan;
  }, [runScan]);

  useEffect(() => {
    void runScanRef.current(false);
  }, [project.id, project.path]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="text-sm text-zinc-500">
          {scanMode === "verify"
            ? "Running npm run build on disk… usually 1–3 min, free, local only"
            : "Scanning folder + reading scope… (fast, no build)"}
        </p>
      </section>
    );
  }

  if (!brief) {
    return (
      <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
        <p className="text-sm text-rose-300">{err ?? "Could not build project brief"}</p>
        <button type="button" onClick={() => void runScan(false)} className="mt-2 text-xs text-teal-500">
          Retry scan
        </button>
      </section>
    );
  }

  const missionComplete = project.ops.errorFixMission?.status === "complete";

  return (
    <>
      <EasySelfBuildBanner
        project={project}
        verifyReport={verifyReport}
        liveGapCount={brief.liveGapCount}
        scan={scan}
        onVerify={() => void runScan(true)}
        onOpenGaps={scrollToGaps}
      />

    <section className="space-y-4 rounded-2xl border border-violet-500/15 bg-violet-500/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/80">
            Project snapshot
          </p>
          <p className="mt-2 text-base font-medium leading-relaxed text-zinc-100">{brief.oneLiner}</p>
          {project.path && (
            <p className="mt-1 font-mono text-[10px] text-zinc-600" title="Jeff OS runs verify build here">
              Disk path: {project.path}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <EasyCostBreakdown project={project} compact />
          <button
            type="button"
            onClick={() => void runScan(true)}
            className="rounded-lg border border-white/[0.08] px-3 py-1 text-xs text-zinc-500 hover:text-zinc-300"
            title="Scan folder + run npm build to check if errors are fixed"
          >
            Update / recheck build
          </button>
        </div>
      </div>

      {verifyReport && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            verifyReport.canAdvance
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/25 bg-amber-500/[0.06] text-amber-200",
          )}
        >
          <p className="font-medium">
            {verifyReport.canAdvance ? "Verify: all clear" : "Verify: still blocked"}
          </p>
          <p className="mt-1 text-xs opacity-90">{verifyReport.summary}</p>
          {verifyReport.projectPath && (
            <p className="mt-1 font-mono text-[10px] opacity-70">
              Verified folder: {verifyReport.projectPath}
            </p>
          )}
          {verifyReport.lintAdvisory && verifyReport.lintNote && (
            <p className="mt-2 text-xs text-zinc-400">{verifyReport.lintNote}</p>
          )}
          {!verifyReport.canAdvance && verifyReport.stillOpenErrors.length > 0 && (
            <p className="mt-2 text-xs opacity-80">
              Open: {verifyReport.stillOpenErrors.slice(0, 3).map((e) => e.title).join(" · ")}
              {verifyReport.stillOpenErrors.length > 3 ? "…" : ""}
            </p>
          )}
          {!verifyReport.canAdvance && verifyReport.stillOpenBlockers.length > 0 && (
            <p className="mt-2 text-xs opacity-80">
              Blockers: {verifyReport.stillOpenBlockers.join(" · ")}
            </p>
          )}
          {!verifyReport.buildPassed && verifyReport.buildLogTail && (
            <>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-relaxed opacity-80">
                {verifyReport.buildLogTail}
              </pre>
              <button
                type="button"
                onClick={() => {
                  setPasteSeed(verifyReport.buildLogTail ?? "");
                  document.getElementById("paste-fix-panel")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 text-xs text-rose-400 hover:underline"
              >
                Paste this into Fix analyzer ↓
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <OperationalStatusButton
          label={brief.operational.label}
          status={brief.operational.status}
          onBlockedClick={scrollToFix}
          onGapsClick={scrollToGaps}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium ring-1",
            statusColors[brief.operational.status],
          )}
        />
        {brief.liveGapCount > 0 && brief.operational.status !== "blocked" && (
          <button
            type="button"
            onClick={scrollToGaps}
            className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-500/25 hover:brightness-110"
          >
            {brief.liveGapCount} gaps → fix
          </button>
        )}
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-zinc-500">
          {brief.operational.percentComplete}% complete
        </span>
        {scan?.signals.slice(0, 3).map((s) => (
          <span key={s} className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-zinc-600">
            {s}
          </span>
        ))}
      </div>

      <PasteFixPanel
        key={pasteSeed || "manual-paste-fix"}
        project={project}
        initialPaste={pasteSeed || undefined}
        onRecheck={() => runScan(true)}
        rechecking={loading && scanMode === "verify"}
        verifyReport={verifyReport}
        nextBuildItems={brief.needsBuild}
      />

      {(fixOpen ||
        missionComplete ||
        brief.operational.status === "blocked" ||
        project.ops.errors.some((e) => !e.resolved) ||
        project.ops.blockers.length > 0) && (
        <EasyErrorFixPanel
          project={project}
          onVerifiedComplete={() => {
            void runScan(true);
            onFixComplete?.();
          }}
        />
      )}

      {gapsOpen && brief.liveGapCount > 0 && (
          <EasyGapsPanel
            project={project}
            brief={brief}
            autoPlan
            onRescan={() => void runScan(true)}
          />
        )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-[10px] uppercase text-zinc-600">Original scope</p>
          <p className="mt-2 text-sm text-zinc-300">{brief.scope.pitch || brief.scope.description}</p>
          {brief.scope.directions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {brief.scope.directions.slice(0, 3).map((d) => (
                <li key={d} className="text-[11px] text-zinc-600">
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-[10px] uppercase text-zinc-600">Connected summary</p>
          <ul className="mt-2 space-y-1.5">
            {brief.connected.slice(0, 5).map((c) => (
              <li key={c.name + c.detail} className="flex items-start gap-2 text-sm">
                <span className={c.ok ? "text-emerald-500" : "text-amber-500"}>
                  {c.ok ? "✓" : "○"}
                </span>
                <span className="text-zinc-400">{c.name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-teal-700">Full list ↓</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
        <EasyConnectionsInventory project={project} inventory={inventory} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-4">
          <p className="text-[10px] uppercase text-emerald-700">Built / working</p>
          <div className="mt-2">
            <BulletList items={brief.built} empty="Nothing detected yet" variant="good" />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-500/10 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase text-zinc-600">Not built</p>
          <div className="mt-2">
            <BulletList items={brief.notBuilt} empty="All core pieces started" variant="neutral" />
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
          <p className="text-[10px] uppercase text-amber-700">Needs build next</p>
          <div className="mt-2">
            <BulletList items={brief.needsBuild} empty="Queue empty" variant="warn" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] p-4">
          <p className="text-[10px] uppercase text-zinc-600">Working well — keep this</p>
          <div className="mt-2">
            <BulletList items={brief.workingWell} empty="Scan again after first ship" variant="good" />
          </div>
        </div>
        <div className="rounded-xl border border-rose-500/10 bg-rose-500/[0.03] p-4">
          <p className="text-[10px] uppercase text-rose-700">Wouldn&apos;t do again</p>
          <div className="mt-2">
            <BulletList items={brief.wouldNotRepeat} empty="No red flags logged" variant="warn" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-teal-500/20 bg-teal-500/5 px-4 py-3">
        <p className="text-xs text-teal-300/90">
          <strong className="text-teal-200">Still need:</strong>{" "}
          {brief.stillNeed.length ? brief.stillNeed.slice(0, 5).join(" · ") : "Nothing critical — say what you want next ↓"}
        </p>
      </div>

      {err && <p className="text-xs text-amber-600">{err}</p>}
    </section>
    </>
  );
}
