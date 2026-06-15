"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import type { ProjectBrief } from "@/lib/project-scan/brief";
import { useMissionControl } from "@/lib/store/context";
import { ProjectFolderBanner } from "@/components/shared/ProjectFolderBanner";
import { useFolderSync } from "@/lib/hooks/use-folder-sync";
import { runFixErrors } from "@/lib/mission/run-fix-errors";
import { EasyAddToProjectPanel } from "@/components/easy/EasyAddToProjectPanel";
import { EasyWhatsNextPanel } from "@/components/easy/EasyWhatsNextPanel";
import { CursorBuildPrerequisites } from "@/components/shared/CursorBuildPrerequisites";
import { useIsLocalhost } from "@/lib/hooks/use-mounted";
import { isLocalHost } from "@/lib/deploy/online-access";
import { cn, copyToClipboard } from "@/lib/utils";

type ScanFeedback = { text: string; tone: "ok" | "warn" | "err" };

function Section({
  title,
  subtitle,
  children,
  tone = "neutral",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const border =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/[0.04]"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/[0.04]"
        : tone === "bad"
          ? "border-rose-500/20 bg-rose-500/[0.04]"
          : "border-white/[0.08] bg-white/[0.02]";

  return (
    <section className={cn("rounded-2xl border p-5", border)}>
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-600">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm text-zinc-300">
          <span className="text-teal-500">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function buildFixNoPasteText(projectName: string, summary: string): string {
  return `# FIX ERRORS — ${projectName}
Result: Build passed — nothing to paste into Cursor.

${summary}

No code fix needed right now.
Use "Add to project" (purple button) for new work.`;
}

export function EasyProjectCockpit({ project }: { project: Project }) {
  const { state, updateProject, addActivity } = useMissionControl();
  const isLocal = useIsLocalhost();
  const live = state.projects.find((p) => p.id === project.id) ?? project;
  const projectRef = useRef(live);
  projectRef.current = live;

  const [brief, setBrief] = useState<ProjectBrief | null>(null);
  const [scanning, setScanning] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixAttempted, setFixAttempted] = useState(false);
  const [fixCopyOk, setFixCopyOk] = useState<boolean | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [fixPrompt, setFixPrompt] = useState("");
  const [fixBuildPassed, setFixBuildPassed] = useState<boolean | null>(null);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [addPrefill, setAddPrefill] = useState("");
  const [addPrefillNonce, setAddPrefillNonce] = useState(0);
  const fixPromptRef = useRef<HTMLDivElement>(null);
  const { status: folderStatus } = useFolderSync(live);
  const folderLinked = Boolean(folderStatus?.exists || live.pathExists);

  const openErrors = useMemo(
    () => live.ops.errors.filter((e) => !e.resolved),
    [live.ops.errors],
  );

  const built = brief?.built ?? live.ops.working;
  const needsBuild = brief?.needsBuild ?? [...live.ops.whatsNext, ...live.ops.blockers];
  const problems = useMemo(() => {
    const list: string[] = [];
    for (const e of openErrors) list.push(e.title);
    for (const b of live.ops.blockers) list.push(b);
    if (brief?.stillNeed.length) {
      for (const g of brief.stillNeed.slice(0, 5)) {
        if (!list.includes(g)) list.push(g);
      }
    }
    return list.slice(0, 12);
  }, [openErrors, live.ops.blockers, brief?.stillNeed]);

  const checkAgain = useCallback(async () => {
    const canScanDisk =
      typeof window !== "undefined" && isLocalHost(window.location.hostname);

    if (!canScanDisk) {
      setScanFeedback({
        text: "Check again only works on your PC (npm run dev). Vercel can't read folders on C:\\ — open localhost, not the live URL.",
        tone: "warn",
      });
      setScanErr(null);
      return;
    }

    if (!projectRef.current.path?.trim()) {
      setScanFeedback({
        text: "Link your project folder first (banner above), then tap Check again.",
        tone: "warn",
      });
      return;
    }

    setScanning(true);
    setScanErr(null);
    setScanFeedback({ text: "Scanning your project folder…", tone: "ok" });

    try {
      const res = await fetch("/api/projects/scan-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectRef.current, verify: false }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        brief?: ProjectBrief;
        updatedOps?: Project["ops"];
        error?: string;
        warning?: string;
        scan?: { exists: boolean; path: string };
      };

      if (!res.ok || !data.ok) {
        const err = data.error ?? `Scan failed (${res.status})`;
        setScanErr(err);
        setScanFeedback({ text: err, tone: "err" });
        return;
      }

      if (data.updatedOps) {
        updateProject({ ...projectRef.current, ops: data.updatedOps });
      }
      if (data.brief) setBrief(data.brief);
      if (data.scan?.exists) {
        updateProject({
          ...projectRef.current,
          path: projectRef.current.path || data.scan.path,
          pathExists: true,
        });
      }

      const at = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setLastScanAt(at);
      const builtCount = data.brief?.built.length ?? 0;
      const problemCount =
        (data.updatedOps?.errors.filter((e) => !e.resolved).length ?? 0) +
        (data.updatedOps?.blockers.length ?? 0);
      const summary = `${builtCount} built · ${problemCount} problem${problemCount === 1 ? "" : "s"}`;
      setScanFeedback({
        text: data.warning
          ? `${data.warning} · Checked ${at}`
          : `Checked ${at} — ${summary}. Lists refreshed (no full build — use Fix errors for that).`,
        tone: "ok",
      });
      setScanErr(null);
      addActivity(`Checked project: ${live.name}`, "project", live.id);

      document.getElementById("project-scan-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      const err = "Scan failed — is npm run dev running on your PC?";
      setScanErr(err);
      setScanFeedback({ text: err, tone: "err" });
    } finally {
      setScanning(false);
    }
  }, [updateProject, addActivity, live.name]);

  useEffect(() => {
    void checkAgain();
  }, [live.id, live.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFixErrors = async () => {
    setFixing(true);
    setFixAttempted(true);
    setStatusMsg(null);
    setFixPrompt("");
    setFixCopyOk(null);
    setFixBuildPassed(null);
    try {
      const result = await runFixErrors(live, state);
      setFixPrompt(result.prompt);
      setFixBuildPassed(result.buildPassed);
      setFixCopyOk(result.prompt ? result.copied : null);
      setStatusMsg(result.message);
      addActivity(
        result.prompt ?
          result.copied ? "Fix prompt copied for Cursor"
          : "Fix prompt ready"
        : result.buildPassed ? "Build passed — no fix prompt"
        : "Fix errors finished",
        result.prompt ? "routing" : "project",
        live.id,
      );
      requestAnimationFrame(() => {
        fixPromptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } finally {
      setFixing(false);
    }
  };

  const openCursor = async () => {
    if (!live.path) {
      setStatusMsg("Pick a folder first.");
      return;
    }
    const res = await fetch("/api/projects/open-in-cursor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: live.path }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setStatusMsg(
      data.ok ? "Cursor opened — paste the fix text in Agent chat." : data.error ?? "Use localhost npm run dev.",
    );
  };

  const percent = brief?.operational.percentComplete ?? live.ops.percentComplete;
  const readiness = (brief?.operational.readiness ?? live.ops.readinessLevel).replace(/-/g, " ");
  const fixPanelText =
    fixPrompt ||
    (fixAttempted && !fixing && statusMsg ? buildFixNoPasteText(live.name, statusMsg) : "");
  const fixHasCursorPrompt = Boolean(fixPrompt.trim());

  const queueBuildFromSuggestion = (intent: string) => {
    setAddPrefill(intent);
    setAddPrefillNonce((n) => n + 1);
    setStatusMsg("Building Add to project prompt — paste in Cursor when ready.");
    requestAnimationFrame(() => {
      document.getElementById("add-to-project")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const askDirection = () => {
    setAddPrefill("");
    setAddPrefillNonce((n) => n + 1);
    setStatusMsg("Describe the outcome you want in Add to project — or set mission in Settings.");
    document.getElementById("add-to-project")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector<HTMLTextAreaElement>("#add-to-project textarea")?.focus();
  };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/easy/projects" className="text-sm text-zinc-600 hover:text-teal-500">
          ← All projects
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-50">{live.name}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {percent}% · {readiness}
          {problems.length > 0 ? ` · ${problems.length} problem${problems.length === 1 ? "" : "s"}` : " · looking good"}
          {lastScanAt ? ` · scanned ${lastScanAt}` : scanning ? " · scanning…" : ""}
        </p>
      </div>

      {!folderLinked && (
        <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] p-5">
          <p className="text-sm font-medium text-teal-100">First: link your folder</p>
          <p className="mt-1 text-sm text-zinc-500">Browse to where this project lives on your PC, then Apply.</p>
          <div className="mt-4">
            <ProjectFolderBanner project={live} />
          </div>
        </div>
      )}

      {folderLinked && (
        <ProjectFolderBanner project={live} collapseWhenLinked />
      )}

      {!folderLinked && (
        <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] p-5">
          <p className="text-sm font-medium text-teal-100">How Jeff OS works (3 steps)</p>
          <ol className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>
              <strong className="text-zinc-200">1. Folder</strong> — link folder above.
            </li>
            <li>
              <strong className="text-zinc-200">2. Add to project</strong> — say what to build → Go → Cursor.
            </li>
            <li>
              <strong className="text-zinc-200">3. Fix errors</strong> — run build → copy prompt → paste in Cursor.
            </li>
            <li>
              <strong className="text-zinc-200">4. Check again</strong> — rescans folder and refreshes lists (not a full build).
            </li>
          </ol>
        </div>
      )}

      <EasyAddToProjectPanel
        project={live}
        prefillIntent={addPrefill}
        prefillNonce={addPrefillNonce}
        autoRunPrefill={Boolean(addPrefill.trim())}
      />

      <EasyWhatsNextPanel
        project={live}
        brief={brief}
        openProblemCount={problems.length}
        onBuildSuggestion={(intent) => queueBuildFromSuggestion(intent)}
        onAskDirection={askDirection}
      />

      <div id="project-scan-results" className="space-y-5">
      <Section
        title="What's built so far"
        subtitle={lastScanAt ? `Last checked ${lastScanAt} — from disk scan.` : "Things that exist or work today."}
        tone="good"
      >
        <BulletList items={built} empty="Nothing detected yet — link the correct folder first." />
      </Section>

      <Section
        title="What still needs to be built"
        subtitle="Next work — not errors, just not done yet."
        tone="warn"
      >
        <BulletList items={needsBuild} empty="No backlog listed — set mission in Settings." />
      </Section>

      <Section
        title="Problems"
        subtitle="Errors and blockers — fix these first."
        tone={problems.length ? "bad" : "good"}
      >
        <BulletList items={problems} empty="No open errors right now. Tap Check again anytime." />
      </Section>
      </div>

      {(fixing || fixAttempted) && (
        <div ref={fixPromptRef} id="fix-errors-prompt">
          <Section
            title="Copy and paste this into Cursor"
            subtitle={
              fixing
                ? "Running build on your folder…"
                : fixHasCursorPrompt
                  ? "Fix errors found problems — copy the box below into Cursor Agent."
                  : fixBuildPassed
                    ? "Build passed — nothing to paste. Read the box so you know what happened."
                    : "Fix errors finished — read the box below."
            }
            tone={fixHasCursorPrompt ? "warn" : fixing ? "neutral" : "good"}
          >
            {fixing && (
              <p className="text-sm text-zinc-400 animate-pulse">Running build… this can take 1–3 minutes.</p>
            )}

            {!fixing && fixPanelText && (
              <div className="space-y-3">
                {fixHasCursorPrompt && fixCopyOk === true && (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    ✓ Copied to clipboard — paste in Cursor Agent (Ctrl+V or Cmd+V).
                  </p>
                )}
                {fixHasCursorPrompt && fixCopyOk === false && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Auto-copy blocked — select all in the box below, Ctrl+C, then paste in Cursor.
                  </p>
                )}
                {!fixHasCursorPrompt && fixBuildPassed && (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    ✓ Nothing to paste — build passed. Do not paste an old prompt from clipboard.
                  </p>
                )}
                <p className="text-xs font-semibold text-teal-300">
                  {fixHasCursorPrompt ? "Copy and paste this into Cursor Agent" : "What Fix errors did (for your eyes)"}
                </p>
                {fixHasCursorPrompt && <CursorBuildPrerequisites project={live} />}
                <textarea
                  readOnly
                  value={fixPanelText}
                  rows={fixHasCursorPrompt ? 14 : 8}
                  className="w-full rounded-xl border border-teal-500/30 bg-black/50 px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-300"
                  onFocus={(e) => e.target.select()}
                />
                {fixHasCursorPrompt && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void copyToClipboard(fixPrompt).then((ok) => {
                          setFixCopyOk(ok);
                          setStatusMsg(
                            ok ? "Copied — paste in Cursor Agent (Ctrl+V)" : "Select all in the box and copy",
                          );
                        })
                      }
                      className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
                    >
                      Copy for Cursor
                    </button>
                    {live.path && isLocal && (
                      <button
                        type="button"
                        onClick={() => void openCursor()}
                        className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-300 hover:text-zinc-100"
                      >
                        Open in Cursor
                      </button>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-zinc-600">
                  {fixHasCursorPrompt
                    ? "After Cursor finishes — tap Check again to refresh the problem list."
                    : "Want new features? Use Add to project (purple button), not Fix errors."}
                </p>
              </div>
            )}
          </Section>
        </div>
      )}

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 -mx-1 space-y-3 rounded-2xl border border-white/10 bg-[#0a0b0e]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
        {scanFeedback && (
          <p
            className={cn(
              "rounded-xl px-3 py-2.5 text-center text-sm",
              scanFeedback.tone === "ok" && "border border-teal-500/30 bg-teal-500/10 text-teal-100",
              scanFeedback.tone === "warn" && "border border-amber-500/30 bg-amber-500/10 text-amber-100",
              scanFeedback.tone === "err" && "border border-rose-500/30 bg-rose-500/10 text-rose-100",
            )}
          >
            {scanFeedback.text}
          </p>
        )}
        <p className="text-center text-xs text-zinc-500">
          {isLocal
            ? "Add to project = new work · Fix errors = run build + copy fix prompt · Check again = rescan folder (no build)"
            : "On the live site: Check again needs your PC (localhost). Fix errors + folder scan don't run on Vercel."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              document.getElementById("add-to-project")?.scrollIntoView({ behavior: "smooth", block: "start" });
              document.querySelector<HTMLTextAreaElement>("#add-to-project textarea")?.focus();
            }}
            className="min-h-[52px] flex-1 rounded-2xl bg-violet-500 text-base font-semibold text-white hover:bg-violet-400"
          >
            Add to project
          </button>
          <button
            type="button"
            disabled={fixing || !live.path}
            onClick={() => void onFixErrors()}
            className="min-h-[52px] flex-1 rounded-2xl bg-rose-500 text-base font-semibold text-white hover:bg-rose-400 disabled:opacity-40"
          >
            {fixing ? "Running build…" : "Fix errors → Cursor"}
          </button>
          <button
            type="button"
            disabled={scanning}
            onClick={() => void checkAgain()}
            title="Rescans your project folder and refreshes What's built / Problems. Does not run npm build — use Fix errors for that."
            className="min-h-[52px] flex-1 rounded-2xl bg-teal-500 text-base font-semibold text-black hover:bg-teal-400 disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Check again"}
          </button>
        </div>
        {live.path && isLocal && (
          <button
            type="button"
            onClick={() => void openCursor()}
            className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Open in Cursor
          </button>
        )}
      </div>

      {(scanErr || (statusMsg && !fixAttempted && !fixing)) && !scanFeedback && (
        <p className={cn("text-sm", scanErr ? "text-amber-400" : "text-teal-400")}>{scanErr ?? statusMsg}</p>
      )}

      <p className="pb-32 text-center text-[10px] text-zinc-700">
        Need more?{" "}
        <Link href="/classic" className="text-zinc-500 hover:text-zinc-400">
          Classic view
        </Link>{" "}
        has extra tabs — Easy mode stays simple on purpose.
      </p>
    </div>
  );
}
