"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { buildFromIntent, buildAddOnFromIntent, routeHint, suggestBuilderEnhancements, type BuilderRoute } from "@/lib/mission/builder-router";
import { onBuilderBuild } from "@/lib/mission/guided-journey";
import { createSpeechRecognitionAdapter } from "@/lib/voice/recognition";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn, copyToClipboard } from "@/lib/utils";

const QUICK_CHIPS: { label: string; intent: string; route: BuilderRoute }[] = [
  { label: "Fix errors", intent: "Fix all build errors and verify npm run build passes", route: "fix" },
  { label: "Close gaps", intent: "Close remaining gaps and make verify show honest truth", route: "gaps" },
  { label: "Ship", intent: "Ship to GitHub and verify Vercel deploy", route: "ship" },
  {
    label: "God Mode",
    intent: "God Mode — simplest way to program, tell me what you need and build it, next level mainstream",
    route: "god",
  },
  {
    label: "One-day sprint",
    intent: "One-day sprint — bots build everything today not weeks, track all projects, new project ease, push and ship",
    route: "god",
  },
  {
    label: "New project",
    intent: "New greenfield project — scaffold repo, verify build, ship ready in one day",
    route: "mission",
  },
];

const ROUTE_COLORS: Record<BuilderRoute, string> = {
  fix: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  gaps: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  ship: "bg-indigo-500/15 text-indigo-200 ring-indigo-500/30",
  god: "bg-violet-500/15 text-violet-200 ring-violet-500/30",
  mission: "bg-teal-500/15 text-teal-200 ring-teal-500/30",
};

export function EasyBuilderHub() {
  const { state, updateProject, switchProject, openWorkspace, addActivity, updateSettings } =
    useMissionControl();
  const [intent, setIntent] = useState("");
  const [projectId, setProjectId] = useState(
    () => state.workspace.activeProjectId ?? state.projects.find((p) => p.id === "proj-jeff-os")?.id ?? state.projects[0]?.id ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [route, setRoute] = useState<BuilderRoute | null>(null);
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState<boolean | null>(null);
  const [stackBaseIntent, setStackBaseIntent] = useState("");
  const [addOnHistory, setAddOnHistory] = useState<string[]>([]);
  const adapterRef = useRef(createSpeechRecognitionAdapter());
  const listeningRef = useRef(false);
  const talkBaseRef = useRef("");
  const talkFinalsRef = useRef("");
  const promptPanelRef = useRef<HTMLDivElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const project = state.projects.find((p) => p.id === projectId) ?? state.projects[0];

  useEffect(() => {
    if (state.workspace.activeProjectId) setProjectId(state.workspace.activeProjectId);
  }, [state.workspace.activeProjectId]);

  const detectedRoute = intent.trim().length > 8 ? routeHint(intent) : null;

  const startTalk = useCallback(async () => {
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
      return;
    }

    talkBaseRef.current = intent.trim();
    talkFinalsRef.current = "";
    listeningRef.current = true;
    setListening(true);
    setMsg("Keep talking — tap I'm done when finished");

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
          setListening(false);
          listeningRef.current = false;
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

  const applyBuildResult = useCallback(
    async (result: NonNullable<ReturnType<typeof buildFromIntent>>, label: string) => {
      if (!project) return;

      updateProject(result.project);
      switchProject(result.project.id);
      openWorkspace(result.project.id);
      setPrompt(result.prompt);
      setRoute(result.route);
      setCopyOk(null);
      setMsg(`${label}${result.stepCount ? ` · ${result.stepCount} steps` : ""}`);

      const ok = await copyToClipboard(result.prompt);
      if (ok) {
        setCopyOk(true);
        setMsg("Copied — paste in Cursor on " + (project.path ?? "project folder"));
      }
      addActivity(`Builder: ${result.routeLabel} — ${project.name}`, "routing", project.id);
      updateSettings(onBuilderBuild(state.settings));

      requestAnimationFrame(() => {
        promptPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [project, updateProject, switchProject, openWorkspace, addActivity, updateSettings, state.settings],
  );

  const runBuild = useCallback(async () => {
    if (!project) {
      setMsg("Pick a project");
      return;
    }
    if (!intent.trim()) {
      setMsg("Tell me what you need");
      inputRef.current?.focus();
      return;
    }

    const result = buildFromIntent(project, intent, state);
    if (!result) {
      setMsg("Could not build — try simpler words");
      return;
    }

    setStackBaseIntent(intent.trim());
    setAddOnHistory([]);
    await applyBuildResult(result, `${result.routeLabel} ready`);
  }, [project, intent, state, applyBuildResult]);

  const runAddOn = useCallback(async () => {
    if (!project) {
      setMsg("Pick a project");
      return;
    }
    if (!prompt || !stackBaseIntent) {
      setMsg("Build it first — then add on");
      return;
    }
    if (!intent.trim()) {
      setMsg("Type the new idea to add on");
      inputRef.current?.focus();
      return;
    }

    const result = buildAddOnFromIntent(
      project,
      stackBaseIntent,
      intent.trim(),
      state,
      addOnHistory,
    );
    if (!result) {
      setMsg("Could not add on — try simpler words");
      return;
    }

    setAddOnHistory((prev) => [...prev, intent.trim()]);
    setIntent("");
    await applyBuildResult(result, `Add-on ready · ${addOnHistory.length + 1} stacked`);
  }, [project, prompt, stackBaseIntent, intent, state, addOnHistory, applyBuildResult]);

  const enhancementIdeas =
    route && project ? suggestBuilderEnhancements(project, route, stackBaseIntent || intent) : [];

  return (
    <div className="border-b border-white/[0.06] bg-[#0c0d12]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl px-4 py-5">
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 shadow-2xl shadow-black/40 ring-1 ring-white/[0.04]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-500/80">
            Jeff Mission Control
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            Tell me what you need. I&apos;ll build it.
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Type or talk — fix, build, ship, gaps, God Mode. Track all projects. Build it → copy → Cursor. New idea? Add on →.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-xs text-zinc-300"
              aria-label="Project"
            >
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {detectedRoute && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-400">
                → {detectedRoute}
              </span>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={2}
            placeholder={
              prompt
                ? "Add another idea — stacks on your build…"
                : "Fix my build… add import for anyone… ship to Vercel… make this mainstream God Mode…"
            }
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#0a0b0e]/90 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-teal-500/40 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void runBuild();
              }
            }}
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setIntent(chip.intent)}
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-medium ring-1 transition hover:brightness-110",
                  ROUTE_COLORS[chip.route],
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runBuild()}
              className="rounded-full bg-teal-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-teal-500/20 hover:bg-teal-400"
            >
              Build it →
            </button>
            {prompt && (
              <button
                type="button"
                onClick={() => void runAddOn()}
                className="rounded-full bg-violet-500/90 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-400"
              >
                Add on →
              </button>
            )}
            {!listening ? (
              <button
                type="button"
                onClick={() => void startTalk()}
                className="rounded-full border border-white/10 px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200"
              >
                🎙 Talk
              </button>
            ) : (
              <>
                <span className="flex items-center rounded-full bg-rose-500/15 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/40 animate-pulse">
                  ● Listening…
                </span>
                <button
                  type="button"
                  onClick={stopTalk}
                  className="rounded-full bg-teal-500 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-teal-500/20 hover:bg-teal-400"
                >
                  I&apos;m done
                </button>
              </>
            )}
            {prompt && (
              <button
                type="button"
                onClick={() => void copyToClipboard(prompt).then((ok) => setCopyOk(ok))}
                className="rounded-full border border-white/10 px-4 py-3 text-sm text-zinc-300"
              >
                Copy again
              </button>
            )}
          </div>

          <p className="mt-2 text-[10px] text-zinc-600">
            Ctrl+Enter to build · Add on stacks ideas · AI prompt includes “make it better” suggestions
          </p>
        </div>

        {addOnHistory.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-zinc-600">Stacked:</span>
            {addOnHistory.map((line, i) => (
              <span
                key={`${i}-${line.slice(0, 12)}`}
                className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300 ring-1 ring-violet-500/20"
              >
                + {line.slice(0, 48)}
                {line.length > 48 ? "…" : ""}
              </span>
            ))}
          </div>
        )}

        {prompt && (
          <div ref={promptPanelRef} className="mt-4 space-y-2 rounded-xl border border-teal-500/20 bg-black/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {route && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] ring-1", ROUTE_COLORS[route])}>
                    {route}
                  </span>
                )}
                <p className="text-xs font-semibold text-teal-300">Paste in Cursor</p>
              </div>
              <CopyButton text={prompt} label="Copy" compact />
            </div>
            {copyOk && <p className="text-xs text-emerald-400">Copied — open {project?.path}</p>}
            <textarea
              ref={promptTextareaRef}
              readOnly
              value={prompt}
              rows={10}
              className="w-full resize-y rounded-lg border border-white/10 bg-[#0a0b0e] px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400"
              onFocus={(e) => e.target.select()}
            />
            {project && (
              <Link href={`/easy/projects/${project.id}`} className="text-xs text-teal-600 hover:underline">
                Open {project.name} snapshot ↗
              </Link>
            )}
            {enhancementIdeas.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400/90">
                  You could also add — great ideas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {enhancementIdeas.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setIntent(idea)}
                      className="rounded-full bg-violet-500/10 px-3 py-1 text-left text-[10px] text-violet-200 ring-1 ring-violet-500/25 hover:bg-violet-500/20"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-600">
                  Tap idea → type tweak → <strong className="text-zinc-500">Add on →</strong> or{" "}
                  <strong className="text-zinc-500">Build it →</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {msg && <p className="mt-3 text-center text-xs text-teal-400">{msg}</p>}
      </div>
    </div>
  );
}
