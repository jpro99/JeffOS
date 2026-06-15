"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
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
}: {
  project: Project;
  compact?: boolean;
  initialPaste?: string;
}) {
  const { state, addActivity } = useMissionControl();
  const [paste, setPaste] = useState(initialPaste ?? "");
  const [analysis, setAnalysis] = useState<PasteAnalysis | null>(null);
  const [cursorPrompt, setCursorPrompt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPaste?.trim()) setPaste(initialPaste);
  }, [initialPaste]);

  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (typeof text === "string" && text.trim()) setPaste(text);
    };
    window.addEventListener("jeff-set-paste-fix", handler);
    return () => window.removeEventListener("jeff-set-paste-fix", handler);
  }, []);

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
          Paste &amp; fix
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Paste anything — build log, TypeScript error, 404, git fail. Jeff OS reads it, tells you{" "}
          <strong className="text-zinc-300">what to run</strong> and gives a{" "}
          <strong className="text-zinc-300">Cursor prompt</strong> that returns real fixes.
        </p>
      </div>

      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        rows={compact ? 6 : 10}
        placeholder={`Paste here — e.g.\n\nFailed to compile.\n./src/app/page.tsx:12:5\nType error: Property 'foo' does not exist...\n\nOr: GET /health 404\nOr: git push rejected...`}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-300 placeholder:text-zinc-700"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runAnalyze()}
          className="rounded-full bg-rose-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          Analyze → get fix
        </button>
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
              </p>
            </div>
          </div>
        )}
      </div>

      {msg && <p className="text-sm text-teal-400">{msg}</p>}
    </section>
  );
}
