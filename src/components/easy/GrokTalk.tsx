"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { TalkProjectStrip } from "@/components/easy/TalkProjectStrip";
import { CLOUD_AGENTS_HOME } from "@/lib/grok/localModels";
import type { TalkLane } from "@/lib/grok/taskRouter";
import type { BotDefinition, Project } from "@/lib/types";

const OPS_KEY = "jeff-os-talk-ops";
const THREAD_KEY = "jeff-os-talk-thread";

type Ops = {
  neverMerge: boolean;
  neverGuess: boolean;
  caveman: boolean;
  preferLocal: boolean;
  /** Jeff picks which brain answers — auto routes by message type. */
  engineMode: "auto" | TalkLane;
  stationedProjectId: string | null;
  lastBotId: string;
  collapsed: string[];
};

type MessageRow = {
  id: string;
  kind: "message";
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  lane?: TalkLane;
  engine?: string;
  model?: string;
  agentUrl?: string;
};

type ActivityRow = {
  id: string;
  kind: "activity";
  text: string;
  done?: boolean;
};

type ThreadRow = MessageRow | ActivityRow;

type StatusPayload = {
  ready: boolean;
  local: { configured: boolean; ready: boolean; model: string | null; label: string | null };
  paid: { label: string; model: string } | null;
  cloudAgents: { home: string };
};

const defaultOps = (): Ops => ({
  neverMerge: true,
  neverGuess: true,
  caveman: true,
  preferLocal: true,
  engineMode: "auto",
  stationedProjectId: "proj-demand-generator",
  lastBotId: "bot-control-tower",
  collapsed: [],
});

function nid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadOps(): Ops {
  if (typeof window === "undefined") return defaultOps();
  try {
    const parsed = JSON.parse(localStorage.getItem(OPS_KEY) || "{}") as Partial<Ops>;
    const merged = { ...defaultOps(), ...parsed };
    if (!merged.engineMode) merged.engineMode = "auto";
    return merged;
  } catch {
    return defaultOps();
  }
}

function answerSourceBadge(lane?: TalkLane, model?: string | null) {
  if (lane === "local") {
    return {
      text: model ? `Free · Home PC · ${model}` : "Free · Home PC",
      className: "talk-source talk-source-free",
    };
  }
  if (lane === "cloud-agent") {
    return {
      text: "Cloud Agent · remote computer",
      className: "talk-source talk-source-agent",
    };
  }
  return {
    text: model ? `Paid · ${model}` : "Paid engine",
    className: "talk-source talk-source-paid",
  };
}

const ENGINE_MODES: { id: Ops["engineMode"]; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Jeff OS picks home vs paid by message" },
  { id: "local", label: "Home PC", hint: "Free Ollama on this computer only" },
  { id: "paid", label: "Paid", hint: "Grok or Gemini — never home Ollama" },
  { id: "cloud-agent", label: "Agent", hint: "Start a Cloud Agent for code work" },
];

export function GrokTalk() {
  const { state } = useMissionControl();
  const [ops, setOps] = useState<Ops>(defaultOps);
  const [hydrated, setHydrated] = useState(false);
  const [tabProjectId, setTabProjectId] = useState<string | null>(null);
  const [botId, setBotId] = useState("bot-control-tower");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [showRules, setShowRules] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadOps();
    setOps(saved);
    setBotId(saved.lastBotId);
    setTabProjectId(saved.stationedProjectId);
    setHydrated(true);
    try {
      const thread = JSON.parse(localStorage.getItem(THREAD_KEY) || "[]") as ThreadRow[];
      if (Array.isArray(thread)) {
        setRows(thread.filter((r) => r.kind === "message").slice(-40));
      }
    } catch {
      /* ignore */
    }
    void fetch("/api/grok/status")
      .then((r) => r.json())
      .then((s: StatusPayload) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(OPS_KEY, JSON.stringify({ ...ops, lastBotId: botId }));
  }, [ops, botId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      THREAD_KEY,
      JSON.stringify(rows.filter((r) => r.kind === "message").slice(-40)),
    );
  }, [rows, hydrated]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [rows, busy]);

  const botsByProject = useMemo(() => {
    const map = new Map<string, BotDefinition[]>();
    for (const project of state.projects) {
      const bots = state.bots.filter(
        (b) =>
          b.projectIds.includes(project.id) ||
          project.assignedGodBotId === b.id ||
          project.workerBotIds.includes(b.id),
      );
      map.set(project.id, bots);
    }
    return map;
  }, [state.bots, state.projects]);

  const ceo = state.bots.find((b) => b.id === "bot-control-tower") ?? state.bots[0];
  const bot = state.bots.find((b) => b.id === botId) ?? ceo;
  const project = state.projects.find((p) => p.id === projectId) ?? null;
  const stationed = state.projects.find((p) => p.id === ops.stationedProjectId) ?? null;

  const visibleProjects = useMemo(() => {
    if (!tabProjectId) return state.projects;
    return state.projects.filter((p) => p.id === tabProjectId);
  }, [state.projects, tabProjectId]);

  const roster = state.projects.map((p) => {
    const names = (botsByProject.get(p.id) ?? []).map((b) => b.name).slice(0, 8).join(", ");
    return `${p.name}: ${names || "Control Tower"}`;
  });

  const patchOps = (next: Partial<Ops>) => setOps((cur) => ({ ...cur, ...next }));

  const toggleCollapsed = (id: string) => {
    patchOps({
      collapsed: ops.collapsed.includes(id)
        ? ops.collapsed.filter((x) => x !== id)
        : [...ops.collapsed, id],
    });
  };

  const pickBot = (next: BotDefinition, onProject: Project | null) => {
    setBotId(next.id);
    setProjectId(onProject?.id ?? null);
    if (next.id === "bot-control-tower" && onProject) {
      patchOps({ stationedProjectId: onProject.id });
    }
  };

  const selectTabProject = (id: string | null) => {
    setTabProjectId(id);
    if (id) {
      patchOps({ stationedProjectId: id });
      const p = state.projects.find((x) => x.id === id);
      if (p && botId === "bot-control-tower") {
        setProjectId(id);
      }
    }
  };

  const pushActivity = useCallback((text: string, done = false) => {
    setRows((cur) => {
      const withoutPending = cur.filter(
        (r) => !(r.kind === "activity" && !r.done && r.text === text),
      );
      return [...withoutPending, { id: nid(), kind: "activity", text, done }];
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !bot || busy) return;

    setInput("");
    setError(null);

    const userId = nid();
    const assistantId = nid();
    const history = rows.filter((r) => r.kind === "message") as MessageRow[];
    const nextMessages: MessageRow[] = [
      ...history,
      { id: userId, kind: "message", role: "user", content: text },
    ];

    setRows([
      ...rows.filter((r) => r.kind === "message"),
      { id: userId, kind: "message", role: "user", content: text },
      {
        id: assistantId,
        kind: "message",
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);
    setBusy(true);

    try {
      const res = await fetch("/api/grok/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((r) => ({ role: r.role, content: r.content })),
          bot: {
            id: bot.id,
            name: bot.name,
            role: bot.role,
            description: bot.description,
            promptPreview: bot.promptPreview,
          },
          project: project
            ? { id: project.id, name: project.name, path: project.path, github: project.github }
            : stationed
              ? { id: stationed.id, name: stationed.name, path: stationed.path, github: stationed.github }
              : null,
          stationed: stationed
            ? { id: stationed.id, name: stationed.name, path: stationed.path, github: stationed.github }
            : null,
          ops: {
            neverMerge: ops.neverMerge,
            neverGuess: ops.neverGuess,
            caveman: ops.caveman,
            preferLocal: ops.preferLocal,
            forceLane: ops.engineMode === "auto" ? null : ops.engineMode,
          },
          roster,
        }),
      });

      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Talk failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let agentUrl: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const event = JSON.parse(payload) as {
              type: string;
              text?: string;
              message?: string;
              agentUrl?: string;
              lane?: TalkLane;
              engine?: string;
              model?: string;
              reply?: string;
            };

            if (event.type === "status" && event.text) {
              pushActivity(event.text, false);
            }
            if (event.type === "token" && event.text) {
              setRows((cur) =>
                cur.map((r) =>
                  r.id === assistantId && r.kind === "message"
                    ? { ...r, content: r.content + event.text }
                    : r,
                ),
              );
            }
            if (event.type === "agent" && event.agentUrl) {
              agentUrl = event.agentUrl;
              pushActivity(`Cloud Agent started`, true);
            }
            if (event.type === "lane" && event.engine) {
              pushActivity(`Using ${event.engine}`, true);
              setRows((cur) =>
                cur.map((r) =>
                  r.id === assistantId && r.kind === "message"
                    ? {
                        ...r,
                        lane: event.lane,
                        engine: event.engine,
                        model: event.model,
                      }
                    : r,
                ),
              );
            }
            if (event.type === "done") {
              setRows((cur) =>
                cur
                  .filter((r) => r.kind !== "activity" || r.done)
                  .map((r) =>
                    r.id === assistantId && r.kind === "message"
                      ? {
                          ...r,
                          content: event.reply || r.content,
                          streaming: false,
                          lane: event.lane,
                          engine: event.engine,
                          model: event.model,
                          agentUrl,
                        }
                      : r,
                  ),
              );
            }
            if (event.type === "error") {
              throw new Error(event.message || "Stream failed");
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Stream failed") {
              /* ignore bad json chunks */
            } else {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talk failed");
      setRows((cur) => cur.filter((r) => r.id !== assistantId));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [bot, busy, input, ops, project, pushActivity, roster, rows, stationed]);

  const listen = () => {
    const Speech =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!Speech) {
      setError("Voice needs Chrome or Edge.");
      return;
    }
    const rec = new Speech();
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      const said = ev.results[0]?.[0]?.transcript ?? "";
      if (said) setInput((cur) => (cur ? `${cur} ${said}` : said));
    };
    rec.start();
  };

  const homeReady = status?.local.ready;
  const homeModel = status?.local.model;
  const paidModel = status?.paid?.model;
  const activeMode = ops.engineMode;
  const engineLine =
    activeMode === "auto"
      ? homeReady
        ? `${status?.local.label ?? "Home PC"} · auto-routes`
        : status?.paid?.label ?? "Add Ollama or API key"
      : activeMode === "local"
        ? homeReady
          ? `Locked · Free · ${homeModel ?? "Home PC"}`
          : "Locked · Home PC (Ollama off)"
        : activeMode === "paid"
          ? `Locked · Paid · ${paidModel ?? "add API key"}`
          : "Locked · Cloud Agent for code";

  return (
    <div className="talk-shell -mx-4 flex min-h-[calc(100dvh-5.5rem)] flex-col md:-mx-0">
      <TalkProjectStrip
        projects={state.projects}
        pinnedIds={state.workspace.pinnedProjectIds}
        activeId={tabProjectId}
        onSelect={selectTabProject}
      />

      <div className="talk-grid flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="talk-rail max-h-[38vh] shrink-0 overflow-auto border-b border-[#2a3c5a]/80 md:max-h-none md:border-b-0 md:border-r">
          <div className="p-3">
            <p className="talk-brand mb-1">Jeff OS Talk</p>
            <p className="talk-brand-sub mb-3">{engineLine}</p>

            <button
              type="button"
              onClick={() => pickBot(ceo, stationed)}
              className={`talk-ceo w-full text-left ${bot?.id === "bot-control-tower" ? "selected" : ""}`}
            >
              <div className="font-bold">◆ Control Tower</div>
              <p className="talk-muted mt-1 text-xs">
                {stationed ? `On ${stationed.name}` : "Pick a project tab above"}
              </p>
            </button>

            {visibleProjects.map((p) => {
              const open = tabProjectId ? true : !ops.collapsed.includes(p.id);
              const bots = botsByProject.get(p.id) ?? [];
              return (
                <div key={p.id} className="talk-project-block mt-2">
                  <button
                    type="button"
                    className="talk-project-head w-full"
                    onClick={() => toggleCollapsed(p.id)}
                    aria-expanded={open}
                  >
                    {open ? "▾" : "▸"} {p.name}
                  </button>
                  {open && (
                    <div>
                      <button
                        type="button"
                        className="talk-bot w-full text-left text-xs opacity-70"
                        onClick={() => {
                          pickBot(ceo, p);
                          patchOps({ stationedProjectId: p.id });
                        }}
                      >
                        Station Tower here
                      </button>
                      {bots.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className={`talk-bot w-full text-left ${
                            bot?.id === b.id && projectId === p.id ? "selected" : ""
                          }`}
                          onClick={() => pickBot(b, p)}
                        >
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="talk-stage flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="talk-stage-top flex flex-wrap items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-slate-100">{bot?.name}</h1>
              <p className="truncate text-xs text-slate-500">
                {project?.name || stationed?.name || "All projects"} · {bot?.role}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                homeReady ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-700/40 text-slate-500"
              }`}
            >
              Home {homeReady ? "on" : "off"}
            </span>
            <a
              href={CLOUD_AGENTS_HOME}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
            >
              Agents
            </a>
          </header>

          <div ref={listRef} className="talk-thread flex-1 overflow-y-auto px-4 py-3">
            {rows.length === 0 && (
              <p className="talk-empty mx-auto max-w-md text-center text-sm text-slate-500">
                Pick a project tab, then a bot on the left. Type below — Jeff OS routes, streams,
                and starts Cloud Agents automatically. No paste-into-Cursor step.
              </p>
            )}

            {rows.map((row) => {
              if (row.kind === "activity") {
                return (
                  <div key={row.id} className="talk-activity mb-2 flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                    {row.text}
                  </div>
                );
              }

              return (
                <article
                  key={row.id}
                  className={`talk-bubble mb-3 ${row.role === "user" ? "user" : "bot"}`}
                >
                  <div className="talk-who">
                    {row.role === "user" ? (
                      "You"
                    ) : (
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{bot?.name}</span>
                        {(row.lane || row.streaming) && (
                          <span className={answerSourceBadge(row.lane, row.model).className}>
                            {row.streaming && !row.lane
                              ? "Answering…"
                              : answerSourceBadge(row.lane, row.model).text}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {row.content}
                    {row.streaming && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-400 align-middle" />
                    )}
                  </div>
                  {row.agentUrl && (
                    <a
                      href={row.agentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-sky-400 hover:underline"
                    >
                      Open Cloud Agent →
                    </a>
                  )}
                </article>
              );
            })}
          </div>

          {error && <p className="px-4 text-xs text-rose-300">{error}</p>}

          <div className="flex flex-wrap gap-2 border-t border-[#2a3c5a]/60 px-4 py-2 text-[11px]">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-300"
              onClick={() => setShowRules((v) => !v)}
            >
              Rules
            </button>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-300"
              onClick={() => setRows([])}
            >
              New chat
            </button>
          </div>

          {showRules && (
            <div className="grid gap-2 px-4 pb-2 text-xs text-slate-500 sm:grid-cols-2">
              {(
                [
                  ["neverMerge", "Never merge to main"],
                  ["neverGuess", "Never guess"],
                  ["caveman", "Caveman voice"],
                  ["preferLocal", "Prefer home PC for small Qs"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex min-h-[36px] items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ops[key]}
                    onChange={(e) => patchOps({ [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
              <p className="col-span-full text-[10px] text-slate-600">
                Code tasks auto-start a Cloud Agent when CURSOR_API_KEY is set.{" "}
                <Link href="/easy/settings" className="text-sky-400">
                  Settings
                </Link>
              </p>
            </div>
          )}

          <form
            className="talk-composer px-4 pb-4 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="talk-engine-picker mb-2 flex flex-wrap gap-1" role="group" aria-label="Answer engine">
              {ENGINE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  title={mode.hint}
                  onClick={() => patchOps({ engineMode: mode.id })}
                  className={`talk-engine-btn ${activeMode === mode.id ? "selected" : ""}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-[#2a3c5a] bg-[#0b1220]/90 p-2 shadow-lg shadow-black/20">
              <button
                type="button"
                onClick={listen}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                title="Voice"
              >
                ⌕
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder="Message…"
                className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-slate-950 disabled:opacity-40"
                title="Send"
              >
                ↑
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">
              {activeMode === "auto"
                ? "Auto picks free home PC for short Qs · paid for hard work · Agent for code"
                : ENGINE_MODES.find((m) => m.id === activeMode)?.hint}
              {homeModel && activeMode !== "paid" ? ` · home: ${homeModel}` : ""}
              {paidModel && activeMode !== "local" ? ` · paid: ${paidModel}` : ""}
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start: () => void;
};
