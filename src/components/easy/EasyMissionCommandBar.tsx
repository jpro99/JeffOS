"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { createCommandSession } from "@/lib/mission/command-session";
import { summarizeIntent } from "@/lib/mission/intent";
import { createSpeechRecognitionAdapter } from "@/lib/voice/recognition";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn, copyToClipboard } from "@/lib/utils";
import { JEFF_OS_NAME } from "@/lib/jeff-os/branding";

export function EasyMissionCommandBar() {
  const { state, updateProject, switchProject, openWorkspace, addActivity } = useMissionControl();
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState("");
  const [projectId, setProjectId] = useState(
    () => state.workspace.activeProjectId ?? state.projects[0]?.id ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState<boolean | null>(null);
  const [sessionMeta, setSessionMeta] = useState<{ steps: number; bots: string[] } | null>(null);
  const adapterRef = useRef(createSpeechRecognitionAdapter());
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const project = state.projects.find((p) => p.id === projectId) ?? state.projects[0];

  useEffect(() => {
    if (state.workspace.activeProjectId) {
      setProjectId(state.workspace.activeProjectId);
    }
  }, [state.workspace.activeProjectId]);

  useEffect(() => {
    const cs = project?.ops.commandSession;
    if (cs?.lastPrompt && !prompt) {
      setPrompt(cs.lastPrompt);
      setIntent(cs.intent);
    }
  }, [project?.id, project?.ops.commandSession, prompt]);

  const startTalk = useCallback(async () => {
    setOpen(true);
    setMsg(null);
    const adapter = adapterRef.current;
    if (!adapter.isSupported) {
      setMsg("Mic not supported — type your command below");
      return;
    }
    const perm = await adapter.requestPermission();
    if (perm === "denied") {
      setMsg("Mic blocked — allow in browser or type below");
      return;
    }
    setListening(true);
    adapter.start({
      onStart: () => setListening(true),
      onResult: (partial, isFinal) => {
        if (isFinal && partial) {
          setIntent((prev) => (prev ? `${prev} ${partial}` : partial));
          setListening(false);
          adapter.stop();
        }
      },
      onError: (e) => {
        setListening(false);
        setMsg(e);
      },
      onEnd: () => setListening(false),
    });
  }, []);

  const stopTalk = useCallback(() => {
    adapterRef.current.stop();
    setListening(false);
  }, []);

  const buildMission = useCallback(async () => {
    if (!project) {
      setMsg("Pick a project first");
      return;
    }
    if (!intent.trim()) {
      setMsg("Say or type what to build, fix, or add");
      return;
    }

    const session = createCommandSession(project, intent, state);
    if (!session) {
      setMsg("Could not build session");
      return;
    }

    updateProject(session.project);
    switchProject(session.project.id);
    openWorkspace(session.project.id);
    setPrompt(session.prompt);
    setSessionMeta({ steps: session.stepCount, bots: session.botRoles });
    setCopyOk(null);
    setOpen(true);
    setMsg(`Mission ready — ${session.featureCount} feature(s), ${session.stepCount} bot steps`);
    addActivity(`Command session: ${project.name}`, "routing", project.id);

    requestAnimationFrame(() => {
      promptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      promptRef.current?.focus();
    });
  }, [project, intent, state, updateProject, switchProject, openWorkspace, addActivity]);

  const copyPrompt = useCallback(async () => {
    const text = prompt || project?.ops.commandSession?.lastPrompt || "";
    if (!text) return;
    const ok = await copyToClipboard(text);
    setCopyOk(ok);
    setMsg(ok ? "Copied — paste in Cursor agent chat" : "Select prompt below and Ctrl+C");
  }, [prompt, project?.ops.commandSession?.lastPrompt]);

  const displayPrompt = prompt || project?.ops.commandSession?.lastPrompt || "";

  return (
    <div className="border-b border-teal-500/15 bg-teal-500/[0.04]">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              open
                ? "bg-teal-500 text-black"
                : "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30 hover:bg-teal-500/30",
            )}
          >
            Command {JEFF_OS_NAME}
          </button>
          <button
            type="button"
            onClick={() => (listening ? stopTalk() : void startTalk())}
            className={cn(
              "rounded-full px-3 py-2 text-sm ring-1",
              listening
                ? "animate-pulse bg-rose-500/20 text-rose-200 ring-rose-500/40"
                : "border border-white/10 text-zinc-400 hover:text-teal-300",
            )}
          >
            {listening ? "● Listening…" : "🎙 Talk"}
          </button>
          {!open && (
            <p className="text-xs text-zinc-600">
              Tell it what to build, fix, or add → auto bots → copy to Cursor
            </p>
          )}
        </div>

        {open && (
          <div className="mt-3 space-y-3 rounded-xl border border-white/[0.08] bg-black/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[10px] uppercase text-zinc-600">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-zinc-200"
              >
                {state.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
              placeholder='Example: Fix the gaps panel, add a ship button, and make verify show honest truth'
              className="w-full resize-y rounded-xl border border-white/10 bg-[#0a0b0e] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            {intent.trim().length > 20 && (
              <p className="text-[10px] text-zinc-600">
                Will plan: {summarizeIntent(intent)}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void buildMission()}
                className="rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
              >
                Build mission → bots + prompt
              </button>
              {displayPrompt && (
                <button
                  type="button"
                  onClick={() => void copyPrompt()}
                  className="rounded-full border border-teal-500/30 bg-teal-500/10 px-5 py-2.5 text-sm text-teal-200"
                >
                  Copy for Cursor
                </button>
              )}
              {project && (
                <Link
                  href={`/easy/projects/${project.id}`}
                  className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Open project ↗
                </Link>
              )}
            </div>

            {sessionMeta && (
              <p className="text-xs text-teal-700/90">
                Created {sessionMeta.bots.length} bot roles · {sessionMeta.steps} steps — paste prompt in Cursor to
                build
              </p>
            )}

            {displayPrompt && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-teal-300">Cursor prompt — paste in agent chat</p>
                  <CopyButton text={displayPrompt} label="Copy" compact />
                </div>
                {copyOk === true && (
                  <p className="text-xs text-emerald-400">Copied — open Cursor on {project?.path ?? "project folder"}</p>
                )}
                <textarea
                  ref={promptRef}
                  readOnly
                  value={displayPrompt}
                  rows={12}
                  className="w-full resize-y rounded-lg border border-white/10 bg-[#0a0b0e] px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-400"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            )}

            {msg && <p className="text-center text-xs text-teal-400">{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
