"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import type { VerifyReport } from "@/lib/project-scan/sync-verify";
import { useMissionControl } from "@/lib/store/context";
import {
  analyzePaste,
  buildPasteFixPrompt,
  buildQuickRunBlock,
  type PasteAnalysis,
} from "@/lib/mission/paste-fix";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn, copyToClipboard } from "@/lib/utils";

export function PasteFixPanel({
  project,
  compact,
  initialPaste,
  onRecheck,
  rechecking = false,
  verifyReport,
  nextBuildItems = [],
}: {
  project: Project;
  compact?: boolean;
  initialPaste?: string;
  onRecheck?: () => Promise<void> | void;
  rechecking?: boolean;
  verifyReport?: VerifyReport | null;
  nextBuildItems?: string[];
}) {
  const { state, addActivity } = useMissionControl();
  const [paste, setPaste] = useState(initialPaste ?? "");
  const [analysis, setAnalysis] = useState<PasteAnalysis | null>(null);
  const [cursorPrompt, setCursorPrompt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialPaste?.trim()) setPaste(initialPaste);
  }, [initialPaste]);

  const runAnalyze = useCallback(async () => {
    if (!paste.trim()) {
      setMsg("Paste terminal output, build errors, or a stack trace first");
      return;
    }
    const a = analyzePaste(paste, project);
    const prompt = buildPasteFixPrompt(paste, project, state, a);
    setAnalysis(a);
    setCursorPrompt(prompt);
    setMsg(null);

    const ok = await copyToClipboard(prompt);
    setMsg(
      ok
        ? `${a.headline} — Cursor prompt copied. Run commands below or paste prompt in Cursor.`
        : `${a.headline} — fix prompt ready below`,
    );
    addActivity(`Paste fix: ${a.headline} — ${project.name}`, "routing", project.id);

    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [paste, project, state, addActivity]);

  const copyCommands = async () => {
    if (!analysis) return;
    const ok = await copyToClipboard(buildQuickRunBlock(analysis));
    setMsg(ok ? "Commands copied" : "Select commands box and copy");
  };

  const runRecheck = useCallback(async () => {
    if (!onRecheck) return;
    if (!project.path) {
      setMsg("Need project folder first — import/link this app from disk so Jeff can run build");
      return;
    }

    setMsg("Checking updates — running build on disk");
    await onRecheck();
  }, [onRecheck, project.path]);

  const loadVerifyLog = () => {
    if (!verifyReport?.buildLogTail) return;
    setPaste(verifyReport.buildLogTail);
    setAnalysis(null);
    setCursorPrompt("");
    setMsg("Latest build log loaded — click Get Cursor fix prompt");
    requestAnimationFrame(() => {
      pasteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      pasteRef.current?.focus();
    });
  };

  const nextProblem =
    verifyReport && !verifyReport.canAdvance
      ? verifyReport.stillOpenErrors[0]?.title ||
        verifyReport.stillOpenBlockers[0] ||
        (!verifyReport.buildPassed ? "Build still failing — load log below" : "Still blocked")
      : null;
  const buildNext =
    nextBuildItems[0] ||
    project.ops.whatsNext[0] ||
    project.ops.nextAction?.title ||
    "pick the next feature below";

  return (
    <section
      id="paste-fix-panel"
      className={cn(
        "space-y-4 rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5",
        compact && "p-4",
      )}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-300/90">
          What is wrong? Paste it here
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Paste the exact error from your app, Cursor, terminal, or Vercel. Jeff makes the Cursor fix prompt.
          When Cursor finishes, click <strong className="text-zinc-300">Update / recheck</strong> to get the
          next problem or see what to build next.
        </p>
      </div>

      <ol className="grid gap-2 text-xs text-zinc-500 sm:grid-cols-4">
        {["Paste error", "Get fix prompt", "Paste in Cursor", "Update / recheck"].map((step, index) => (
          <li key={step} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
            <span className="text-rose-300">{index + 1}.</span> {step}
          </li>
        ))}
      </ol>

      <textarea
        ref={pasteRef}
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        rows={compact ? 6 : 10}
        placeholder={`Paste what is wrong here — e.g.\n\nI was in the app and saw: Error: Cannot read properties of undefined\n\nOr paste full build output:\nFailed to compile.\n./src/app/page.tsx:12:5\nType error: Property 'foo' does not exist...\n\nOr: GET /health 404\nOr: git push rejected...`}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-300 placeholder:text-zinc-700"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runAnalyze()}
          className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          Get Cursor fix prompt
        </button>
        {onRecheck && (
          <button
            type="button"
            onClick={() => void runRecheck()}
            disabled={rechecking}
            className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            {rechecking ? "Checking updates…" : "Cursor done? Update / recheck"}
          </button>
        )}
        {analysis && (
          <button
            type="button"
            onClick={() => void copyCommands()}
            className="rounded-full border border-white/10 px-4 py-2.5 text-xs text-zinc-300"
          >
            Copy run commands
          </button>
        )}
      </div>

      {verifyReport && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3",
            verifyReport.canAdvance
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/[0.06]",
          )}
        >
          <p
            className={cn(
              "text-sm font-semibold",
              verifyReport.canAdvance ? "text-emerald-300" : "text-amber-200",
            )}
          >
            {verifyReport.canAdvance ? "Build passed — build next" : "Still broken — next problem"}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {verifyReport.canAdvance ? `Next: ${buildNext}` : nextProblem}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{verifyReport.summary}</p>
          {!verifyReport.canAdvance && verifyReport.buildLogTail && (
            <button
              type="button"
              onClick={loadVerifyLog}
              className="mt-3 rounded-full border border-amber-500/25 bg-black/20 px-4 py-2 text-xs text-amber-100 hover:border-amber-400/50"
            >
              Use latest build log as new error
            </button>
          )}
        </div>
      )}

      <div ref={resultRef}>
        {analysis && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3">
              <p className="text-xs font-semibold text-rose-200">{analysis.headline}</p>
              <p className="mt-1 text-sm text-zinc-400">{analysis.summary}</p>
              {analysis.fileRefs.length > 0 && (
                <ul className="mt-2 space-y-1 font-mono text-[10px] text-teal-600/90">
                  {analysis.fileRefs.map((f) => (
                    <li key={f}>→ {f}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-100">Run these commands (you or Cursor)</p>
                <CopyButton text={buildQuickRunBlock(analysis)} label="Copy" compact />
              </div>
              <pre className="mt-2 overflow-x-auto font-mono text-[11px] text-zinc-400">
                {buildQuickRunBlock(analysis)}
              </pre>
              <p className="mt-2 text-[10px] text-zinc-600">
                Jeff OS cannot run these in the browser — copy to PowerShell or let Cursor agent run them in STEP 3.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-teal-500/25 bg-black/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-teal-300">
                  Cursor fix prompt — paste in agent chat for code changes
                </p>
                <CopyButton text={cursorPrompt} label="Copy all" compact />
              </div>
              <textarea
                readOnly
                value={cursorPrompt}
                rows={compact ? 12 : 16}
                className="w-full cursor-text rounded-lg border border-white/10 bg-[#0a0b0e] px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400"
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.currentTarget.select()}
              />
              <p className="text-[10px] text-zinc-600">
                Cursor agent fixes files on disk and replies with{" "}
                <span className="font-mono text-zinc-500">PASTE FIX DONE</span> + commands + code if needed.
                Then come back here and click{" "}
                <span className="font-semibold text-zinc-500">Update / recheck</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {msg && <p className="text-sm text-teal-400">{msg}</p>}
    </section>
  );
}
