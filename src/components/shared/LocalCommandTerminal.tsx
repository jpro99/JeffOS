"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { suggestProjectFolder } from "@/lib/mission/build-prerequisites";
import { useIsLocalhost } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";

interface TerminalLine {
  id: string;
  kind: "cmd" | "out" | "err" | "info";
  text: string;
}

interface LocalCommandTerminalProps {
  project: Project;
  defaultOpen?: boolean;
}

const QUICK_CMDS = ["npm run build", "npm run lint", "git status", "npx tsc --noEmit"] as const;

export function LocalCommandTerminal({ project, defaultOpen }: LocalCommandTerminalProps) {
  const isLocal = useIsLocalhost();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cwd = project.path?.trim() || suggestProjectFolder(project);

  const append = useCallback((kind: TerminalLine["kind"], text: string) => {
    setLines((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, kind, text }]);
  }, []);

  const run = useCallback(
    async (command: string) => {
      const cmd = command.trim();
      if (!cmd || running) return;

      append("cmd", `$ ${cmd}`);
      setRunning(true);

      try {
        const res = await fetch("/api/projects/run-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project, command: cmd, cwd }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          output?: string;
          message?: string;
          error?: string;
          exitCode?: number | null;
        };

        if (data.output) append(data.ok ? "out" : "err", data.output);
        if (data.message) append("info", data.message);
        if (data.error) append("err", data.error);

        if (data.output && !data.ok) {
          window.dispatchEvent(new CustomEvent("jeff-set-paste-fix", { detail: data.output }));
        }
      } catch {
        append("err", "Request failed — is npm run dev running on localhost?");
      } finally {
        setRunning(false);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    },
    [append, cwd, project, running],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const cmd = (e as CustomEvent<string>).detail;
      if (typeof cmd === "string") {
        setOpen(true);
        void run(cmd);
      }
    };
    window.addEventListener("jeff-run-terminal", handler);
    return () => window.removeEventListener("jeff-run-terminal", handler);
  }, [run]);

  if (!isLocal) {
    return (
      <section
        id="local-command-terminal"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
      >
        <p className="text-xs text-zinc-500">
          <strong className="text-zinc-400">Terminal</strong> — runs on your PC when you use{" "}
          <span className="font-mono text-zinc-600">npm run dev</span> locally. The live Vercel site cannot run
          shell commands on your machine.
        </p>
      </section>
    );
  }

  return (
    <section
      id="local-command-terminal"
      className="rounded-2xl border border-zinc-700/50 bg-[#0c0d10] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Local terminal — localhost only
          </p>
          <p className="mt-0.5 text-xs text-zinc-600">
            Run npm / git in your project folder · not a full Cursor chat — use Paste &amp; fix + Cursor for AI fixes
          </p>
        </div>
        <span className="text-xs text-teal-500">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06]">
          <p className="px-4 py-2 font-mono text-[10px] text-zinc-600 truncate" title={cwd}>
            cwd: {cwd}
          </p>

          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {QUICK_CMDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                disabled={running}
                onClick={() => void run(cmd)}
                className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-zinc-400 hover:bg-white/[0.05] disabled:opacity-40"
              >
                {cmd}
              </button>
            ))}
          </div>

          <div
            ref={scrollRef}
            className="mx-4 mb-2 max-h-64 overflow-y-auto rounded-lg bg-black/60 p-3 font-mono text-[11px] leading-relaxed"
          >
            {lines.length === 0 ? (
              <p className="text-zinc-700">Output appears here. Try npm run build to see errors.</p>
            ) : (
              lines.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "whitespace-pre-wrap break-words",
                    line.kind === "cmd" && "text-teal-500/90",
                    line.kind === "out" && "text-zinc-400",
                    line.kind === "err" && "text-rose-400/90",
                    line.kind === "info" && "text-amber-500/80",
                  )}
                >
                  {line.text}
                </div>
              ))
            )}
            {running && <p className="text-zinc-600 animate-pulse">Running…</p>}
          </div>

          <form
            className="flex gap-2 border-t border-white/[0.06] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(input);
              setInput("");
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="npm run build"
              disabled={running}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300 placeholder:text-zinc-700"
            />
            <button
              type="submit"
              disabled={running || !input.trim()}
              className="rounded-lg bg-teal-500/90 px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              Run
            </button>
          </form>

          <p className="px-4 pb-3 text-[10px] text-zinc-700">
            Allowed: npm run build/lint/dev, git status/log/diff, npx tsc --noEmit. Failed output auto-sends to Paste
            &amp; fix.
          </p>
        </div>
      )}
    </section>
  );
}
