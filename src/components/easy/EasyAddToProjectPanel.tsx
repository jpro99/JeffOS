"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { buildAddToProjectPrompt } from "@/lib/mission/add-to-project";
import {
  analyzeDesignFile,
  readImageFile,
  type DesignReference,
} from "@/lib/mission/design-from-image";
import { createSpeechRecognitionAdapter } from "@/lib/voice/recognition";
import { CursorBuildPrerequisites } from "@/components/shared/CursorBuildPrerequisites";
import { copyToClipboard } from "@/lib/utils";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type DesignAttachment = {
  file: File;
  preview: string;
  analysis?: DesignReference;
};

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
  const [design, setDesign] = useState<DesignAttachment | null>(null);
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
  const fileRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  const attachImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMsg("Pick an image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setMsg("Image too large — max 5 MB");
      return;
    }
    setExpanded(true);
    setMsg(null);
    try {
      const preview = await readImageFile(file);
      setDesign({ file, preview });
    } catch {
      setMsg("Could not read image — try another file");
    }
  }, []);

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      void attachImageFile(file);
    },
    [attachImageFile],
  );

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
    if (!trimmed && !design) {
      setMsg("Say, type, or add a reference photo — then tap Go");
      setExpanded(true);
      inputRef.current?.focus();
      return;
    }

    setBuilding(true);
    setMsg(null);
    try {
      let designRef: DesignReference | undefined;
      if (design) {
        designRef = await analyzeDesignFile(design.file);
        setDesign((prev) => (prev ? { ...prev, analysis: designRef } : prev));
      }

      const result = buildAddToProjectPrompt(live, trimmed, state, designRef);
      if (!result) {
        setMsg("Could not build prompt — try simpler words");
        return;
      }

      updateProject(result.project);
      setPrompt(result.prompt);
      setExpanded(true);

      const ok = await copyToClipboard(result.prompt);
      const attachNote = design ? " · also drag the reference photo into Cursor" : "";
      setMsg(
        ok ?
          `Copied — paste in Cursor on ${live.path ?? "your project folder"}${attachNote}`
        : `Prompt ready — copy below and paste in Cursor${attachNote}`,
      );
      addActivity(`Add to project: ${live.name} — ${result.summary}`, "routing", live.id);

      requestAnimationFrame(() => {
        promptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setMsg("Could not analyze image — try another photo");
    } finally {
      setBuilding(false);
    }
  }, [intent, design, live, state, updateProject, addActivity]);

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
    <section
      id="add-to-project"
      className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.05] p-5"
      onPaste={onPaste}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-violet-100">Add to the project</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Type, talk, or add a reference photo — Go → paste in Cursor (attach the same photo there).
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
            placeholder="Example: Match this UI style. Add a search box. Replicate the purple accent and dark cards from my screenshot."
            className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void runGo();
              }
            }}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attachImageFile(file);
              e.target.value = "";
            }}
          />

          {design ? (
            <div className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded data URL preview */}
              <img
                src={design.preview}
                alt="Reference design"
                className="max-h-32 max-w-[200px] rounded-lg border border-white/10 object-contain"
              />
              <div className="min-w-0 flex-1 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Reference photo</p>
                <p className="mt-1 truncate">{design.file.name}</p>
                {design.analysis && (
                  <p className="mt-1 text-violet-300/90">
                    {design.analysis.summary} · palette in prompt
                  </p>
                )}
                <p className="mt-2 text-zinc-500">Drag this image into Cursor when you paste the prompt.</p>
              </div>
              <button
                type="button"
                onClick={() => setDesign(null)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-violet-500/30 bg-violet-500/[0.03] px-4 py-3 text-sm text-violet-200/80 hover:border-violet-500/50 hover:bg-violet-500/[0.06]"
            >
              📷 Add reference photo — or paste screenshot (Ctrl+V)
            </button>
          )}

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
            {!design && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04]"
              >
                📷 Photo
              </button>
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

          <p className="text-[10px] text-zinc-600">
            Ctrl+Enter = Go · Paste screenshot in box · Photo extracts colors for the prompt
          </p>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-teal-400">{msg}</p>}

      {prompt && expanded && (
        <div ref={promptRef} className="mt-4 space-y-3 rounded-xl border border-teal-500/30 bg-black/40 p-4">
          <p className="text-xs font-semibold text-teal-300">Paste this in Cursor Agent</p>
          {design && (
            <p className="text-xs text-amber-200/90">
              Also attach your reference photo in Cursor — colors are in the prompt, the image shows layout and spacing.
            </p>
          )}
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
