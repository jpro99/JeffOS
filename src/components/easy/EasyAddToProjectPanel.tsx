"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { buildAddToProjectPrompt } from "@/lib/mission/add-to-project";
import { createSpeechRecognitionAdapter } from "@/lib/voice/recognition";
import { CursorBuildPrerequisites } from "@/components/shared/CursorBuildPrerequisites";
import { copyToClipboard } from "@/lib/utils";

export function EasyAddToProjectPanel({
  project,
  prefillIntent,
  prefillNonce = 0,
  autoRunPrefill = false,
}: {
  project: Project;
  prefillIntent?: string;
  prefillNonce?: number;
  autoRunPrefill?: boolean;
}) {
  const { state, updateProject, addActivity } = useMissionControl();
  const live = state.projects.find((p) => p.id === project.id) ?? project;

  const [intent, setIntent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [building, setBuilding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const adapterRef = useRef(createSpeechRecognitionAdapter());
  const listeningRef = useRef(false);
  const talkBaseRef = useRef("");
  const talkFinalsRef = useRef("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  const startTalk = useCallback(async () => {
    setExpanded(true);
    setMsg(null);
    const adapter = adapterRef.current;
    if (!adapter.isSupported) {
      setMsg("Mic not supported — type below");
      inputRef.current?.focus();
      return;
    }
    const perm = await adapter.requestPermission();
    if (perm === "denied") {
      setMsg("Mic blocked — type below");
      inputRef.current?.focus();
      return;
    }

    talkBaseRef.current = intent.trim();
    talkFinalsRef.current = "";
    listeningRef.current = true;
    setListening(true);
    setMsg("Talk now — tap Done when finished, then Go");

    adapter.start(
      {
        onResult: (partial, isFinal) => {
          if (!listeningRef.current) return;
          if (isFinal && partial) {
            talkFinalsRef.current = talkFinalsRef.current
              ? `${talkFinalsRef.current} ${partial}`.trim()
              : partial;
          }
          const parts = [talkBaseRef.current, talkFinalsRef.current];
          if (!isFinal && partial) parts.push(partial);
          const combined = parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
          if (combined) setIntent(combined);
        },
        onError: (e) => {
          if (!listeningRef.current) return;
          listeningRef.current = false;
          setListening(false);
          setMsg(e);
        },
        onEnd: () => {
          if (listeningRef.current) return;
          setListening(false);
        },
      },
      { continuous: true },
    );
  }, [intent]);

  const stopTalk = useCallback(() => {
    listeningRef.current = false;
    adapterRef.current.stop();
    setListening(false);
    setMsg(null);
  }, []);

  const runGo = useCallback(async (intentOverride?: string) => {
    const trimmed = (intentOverride ?? intent).trim().replace(/\bgo\s*$/i, "").trim();
    if (!trimmed) {
      setMsg("Say or type what to add — then tap Go");
      setExpanded(true);
      inputRef.current?.focus();
      return;
    }

    setBuilding(true);
    setMsg(null);
    try {
      const result = buildAddToProjectPrompt(live, trimmed, state);
      if (!result) {
        setMsg("Could not build prompt — try simpler words");
        return;
      }

      updateProject(result.project);
      setPrompt(result.prompt);
      setExpanded(true);

      const ok = await copyToClipboard(result.prompt);
      setMsg(
        ok
          ? `Copied — paste in Cursor on ${live.path ?? "your project folder"}`
          : "Prompt ready — copy below and paste in Cursor",
      );
      addActivity(`Add to project: ${live.name} — ${result.summary}`, "routing", live.id);

      requestAnimationFrame(() => {
        promptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } finally {
      setBuilding(false);
    }
  }, [intent, live, state, updateProject, addActivity]);

  const runGoRef = useRef(runGo);
  runGoRef.current = runGo;

  useEffect(() => {
    if (!prefillIntent?.trim()) return;
    setIntent(prefillIntent.trim());
    setExpanded(true);
    if (autoRunPrefill) {
      requestAnimationFrame(() => {
        void runGoRef.current(prefillIntent.trim());
      });
    }
  }, [prefillIntent, prefillNonce, autoRunPrefill]);

  return (
    <section id="add-to-project" className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-violet-100">Add to the project</h2>
          <p className="mt-1 text-sm text-zinc-500">
            What do you want to add or change? Type or talk — then Go → paste in Cursor.
          </p>
        </div>
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400"
          >
            Open
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <textarea
            ref={inputRef}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={4}
            placeholder="Example: Add a search box on the home page. Fix the login button color. Add export to CSV."
            className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void runGo();
              }
            }}
          />

          <div className="flex flex-wrap gap-2">
            {!listening ? (
              <button
                type="button"
                onClick={() => void startTalk()}
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04]"
              >
                🎙 Talk
              </button>
            ) : (
              <>
                <span className="flex items-center rounded-full bg-rose-500/15 px-4 py-2.5 text-sm text-rose-200 ring-1 ring-rose-500/40 animate-pulse">
                  ● Listening…
                </span>
                <button
                  type="button"
                  onClick={stopTalk}
                  className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-300"
                >
                  Done talking
                </button>
              </>
            )}
            <button
              type="button"
              disabled={building}
              onClick={() => void runGo()}
              className="min-h-[44px] flex-1 rounded-2xl bg-violet-500 px-6 py-2.5 text-base font-semibold text-white hover:bg-violet-400 disabled:opacity-40 sm:flex-none"
            >
              {building ? "Building prompt…" : "Go → Cursor"}
            </button>
            {prompt && (
              <button
                type="button"
                onClick={() => void copyToClipboard(prompt).then((ok) => setMsg(ok ? "Copied again" : "Select and copy"))}
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-400"
              >
                Copy again
              </button>
            )}
          </div>

          <p className="text-[10px] text-zinc-600">Ctrl+Enter = Go · Say your idea, tap Done talking, then Go</p>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-teal-400">{msg}</p>}

      {prompt && expanded && (
        <div ref={promptRef} className="mt-4 space-y-3 rounded-xl border border-teal-500/30 bg-black/40 p-4">
          <p className="text-xs font-semibold text-teal-300">Paste this in Cursor Agent</p>
          <CursorBuildPrerequisites project={live} />
          <textarea
            readOnly
            value={prompt}
            rows={12}
            className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-[11px] leading-relaxed text-zinc-300"
            onFocus={(e) => e.target.select()}
          />
          <p className="text-[10px] text-zinc-600">After Cursor finishes — tap Check again on this page.</p>
        </div>
      )}

      {!expanded && intent && (
        <p className="mt-2 truncate text-xs text-zinc-500">{intent}</p>
      )}
    </section>
  );
}
