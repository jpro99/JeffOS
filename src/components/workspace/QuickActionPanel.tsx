"use client";

import { useMemo } from "react";
import type { Project, QuickCommandId } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { resolveQuickCommand } from "@/lib/intelligence/commands";
import {
  buildQuickActionGuide,
  dispatchPasteFixSeed,
  errorsToPasteText,
  scrollToLocalTerminal,
  scrollToPasteFix,
} from "@/lib/intelligence/quick-action-guide";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge } from "@/components/ui/Badge";
import { cn, copyToClipboard } from "@/lib/utils";

interface QuickActionPanelProps {
  project: Project;
  commandId: QuickCommandId;
  onClose: () => void;
  onRunTerminal?: (command: string) => void;
}

export function QuickActionPanel({ project, commandId, onClose, onRunTerminal }: QuickActionPanelProps) {
  const { state, addActivity } = useMissionControl();

  const result = useMemo(
    () => resolveQuickCommand(commandId, project, state),
    [commandId, project, state],
  );

  const guide = useMemo(
    () => buildQuickActionGuide(commandId, project, result),
    [commandId, project, result],
  );

  const openInCursor = async () => {
    if (!project.path) return;
    const res = await fetch("/api/projects/open-in-cursor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath: project.path }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    addActivity(
      data.ok ? "Opened project in Cursor" : data.error ?? "Open Cursor failed",
      "project",
      project.id,
    );
  };

  const sendErrorsToPasteFix = () => {
    const text = errorsToPasteText(guide.errors) || result.prompt;
    dispatchPasteFixSeed(text);
    scrollToPasteFix();
  };

  const runTerminal = (cmd: string) => {
    if (onRunTerminal) {
      onRunTerminal(cmd);
    } else {
      scrollToLocalTerminal();
      window.dispatchEvent(new CustomEvent("jeff-run-terminal", { detail: cmd }));
    }
  };

  const isFix = commandId === "fix-errors" || commandId === "fix-next-issue" || commandId === "review-errors";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-lg",
        isFix ? "border-rose-500/30 bg-rose-500/[0.06]" : "border-teal-500/30 bg-teal-500/[0.06]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Action guide</p>
          <h3 className="mt-1 text-lg font-semibold text-zinc-100">{guide.headline}</h3>
          <p className="mt-1 text-sm text-zinc-400">{guide.summary}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500 hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      <ol className="mt-4 space-y-3">
        {guide.steps.map((step) => (
          <li key={step.n} className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold text-teal-400">
              {step.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">{step.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{step.detail}</p>
              {step.action === "copy" && (
                <button
                  type="button"
                  onClick={() => void copyToClipboard(result.prompt)}
                  className="mt-2 rounded-full bg-teal-500/20 px-3 py-1 text-[11px] text-teal-300 hover:bg-teal-500/30"
                >
                  Copy prompt now
                </button>
              )}
              {step.action === "cursor" && (
                <button
                  type="button"
                  onClick={() => void openInCursor()}
                  className="mt-2 rounded-full bg-violet-500/20 px-3 py-1 text-[11px] text-violet-200 hover:bg-violet-500/30"
                >
                  Open in Cursor
                </button>
              )}
              {step.action === "paste-fix" && (
                <button
                  type="button"
                  onClick={sendErrorsToPasteFix}
                  className="mt-2 rounded-full bg-rose-500/20 px-3 py-1 text-[11px] text-rose-200 hover:bg-rose-500/30"
                >
                  Go to Paste &amp; fix
                </button>
              )}
              {step.action === "terminal" && guide.suggestedTerminalCommand && (
                <button
                  type="button"
                  onClick={() => runTerminal(guide.suggestedTerminalCommand!)}
                  className="mt-2 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] text-amber-100 hover:bg-amber-500/30"
                >
                  Run {guide.suggestedTerminalCommand}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {guide.errors.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-rose-300/80">Issues to fix</p>
          {guide.errors.map((e) => (
            <div key={e.id} className="rounded-xl border border-rose-500/20 bg-black/30 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-zinc-200">{e.title}</p>
                <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-300">{e.severity}</Badge>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Cause: {e.likelyCause}</p>
              <p className="mt-1 text-sm text-zinc-400">{e.recommendedFix}</p>
            </div>
          ))}
        </div>
      )}

      {guide.blockers.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-xs font-semibold text-amber-200">Blockers</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
            {guide.blockers.map((b) => (
              <li key={b}>· {b}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-zinc-400">{guide.promptLabel}</p>
          <CopyButton text={result.prompt} label="Copy all" compact />
        </div>
        <textarea
          readOnly
          value={result.prompt}
          rows={8}
          className="w-full cursor-text rounded-lg border border-white/10 bg-[#0a0b0e] px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400"
          onFocus={(e) => e.target.select()}
          onClick={(e) => e.currentTarget.select()}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyToClipboard(result.prompt)}
          className="rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-black hover:bg-teal-400"
        >
          Copy prompt
        </button>
        <button
          type="button"
          onClick={() => void openInCursor()}
          className="rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-sm text-violet-200"
        >
          Open in Cursor
        </button>
        {isFix && (
          <>
            <button
              type="button"
              onClick={sendErrorsToPasteFix}
              className="rounded-full border border-rose-500/30 bg-rose-500/10 px-5 py-2 text-sm text-rose-200"
            >
              Send to Paste &amp; fix
            </button>
            <button
              type="button"
              onClick={() => runTerminal("npm run build")}
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-sm text-amber-100"
            >
              Run build in terminal
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-[10px] text-zinc-600">
        Jeff OS plans in the browser. Cursor + local terminal (npm run dev) do the real work on your PC.
        Full AI chat like this panel lives in Cursor — paste the prompt there.
      </p>
    </div>
  );
}
