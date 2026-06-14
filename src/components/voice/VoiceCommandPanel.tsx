"use client";

import { useMissionControl } from "@/lib/store/context";
import { useVoice } from "@/components/voice/VoiceProvider";
import { cn } from "@/lib/utils";

export function VoiceCommandPanel() {
  const { state } = useMissionControl();
  const {
    panelOpen,
    closePanel,
    phase,
    transcript,
    interpretation,
    errorMessage,
    successMessage,
    micPermissionState,
    isSupported,
    voiceEnabled,
    voiceMode,
    voiceResponseEnabled,
    setTranscript,
    processTranscript,
    confirmCommand,
    cancel,
    retry,
    startListening,
  } = useVoice();

  if (!panelOpen) return null;

  const project = interpretation?.targetProjectId
    ? state.projects.find((p) => p.id === interpretation.targetProjectId)
    : undefined;
  const bot = interpretation?.targetBotId
    ? state.bots.find((b) => b.id === interpretation.targetBotId)
    : undefined;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14161c]/98 shadow-2xl"
        role="dialog"
        aria-label="Voice command"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Voice command</p>
            <p className="text-xs text-zinc-600">
              {voiceMode === "push-to-talk" ? "Hold mic to talk" : "Tap mic to talk"}
            </p>
          </div>
          <button type="button" onClick={closePanel} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          <StatusPill phase={phase} />

          {!voiceEnabled && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
              Voice off in Settings. Use text mode below or enable voice.
            </p>
          )}

          {!isSupported && (
            <div className="rounded-xl bg-white/[0.03] px-3 py-3 text-sm text-zinc-400">
              <p className="font-medium text-zinc-300">Text command mode</p>
              <p className="mt-1 text-xs text-zinc-600">
                Browser speech not supported here. Type your command below.
              </p>
            </div>
          )}

          {micPermissionState === "denied" && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-3 text-sm text-rose-200/90">
              <p className="font-medium">Microphone blocked</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-rose-200/70">
                <li>Click lock icon in browser address bar</li>
                <li>Allow microphone for this site</li>
                <li>Reload page and retry</li>
              </ol>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-600">Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder='Try: "Continue coding on Demand Generator Pro"'
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-teal-500/30"
            />
          </div>

          {interpretation && (
            <div className="rounded-xl bg-teal-500/5 p-3 ring-1 ring-teal-500/15">
              <p className="text-[10px] uppercase text-teal-700">Interpreted</p>
              <p className="mt-1 text-sm font-medium text-zinc-100">{interpretation.interpretedCommand}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-zinc-600">Project</dt>
                  <dd className="text-zinc-300">{project?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Bot</dt>
                  <dd className="text-zinc-300">{bot?.name ?? "Auto-route"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Action</dt>
                  <dd className="text-zinc-300">
                    {interpretation.quickCommandId?.replace(/-/g, " ") ??
                      interpretation.targetAction ??
                      "Status"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Confidence</dt>
                  <dd className="text-zinc-300">{Math.round(interpretation.confidence * 100)}%</dd>
                </div>
              </dl>
              {interpretation.requiresConfirmation && phase === "confirm" && (
                <p className="mt-2 text-xs text-amber-400/90">Confirm before run — low confidence or broad match.</p>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{errorMessage}</p>
          )}
          {successMessage && (
            <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{successMessage}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {isSupported && voiceEnabled && (
              <button
                type="button"
                onClick={startListening}
                className="rounded-full bg-rose-500/15 px-4 py-2 text-sm text-rose-200 ring-1 ring-rose-500/25"
              >
                🎙 Talk
              </button>
            )}
            <button
              type="button"
              onClick={() => processTranscript(transcript)}
              className="rounded-full bg-teal-500/15 px-4 py-2 text-sm text-teal-200 ring-1 ring-teal-500/25"
            >
              Parse
            </button>
            {(phase === "confirm" || interpretation) && (
              <button
                type="button"
                onClick={confirmCommand}
                className="rounded-full bg-white/[0.08] px-4 py-2 text-sm text-zinc-100"
              >
                Run command
              </button>
            )}
            {phase === "error" && (
              <button type="button" onClick={retry} className="rounded-full border border-white/10 px-4 py-2 text-sm">
                Retry
              </button>
            )}
            <button type="button" onClick={cancel} className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400">
              Cancel
            </button>
          </div>

          <p className="text-[10px] text-zinc-600">
            Voice response {voiceResponseEnabled ? "on" : "off"} · Examples: open Keps Trading, fix next issue, God Mode
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ phase }: { phase: string }) {
  const map: Record<string, { label: string; className: string }> = {
    idle: { label: "Ready", className: "bg-white/5 text-zinc-500" },
    listening: { label: "Listening", className: "bg-rose-500/15 text-rose-300 animate-pulse" },
    transcribing: { label: "Transcribing", className: "bg-amber-500/15 text-amber-300" },
    processing: { label: "Processing", className: "bg-sky-500/15 text-sky-300" },
    confirm: { label: "Confirm", className: "bg-violet-500/15 text-violet-300" },
    success: { label: "Success", className: "bg-emerald-500/15 text-emerald-300" },
    error: { label: "Failed", className: "bg-rose-500/15 text-rose-300" },
  };
  const s = map[phase] ?? map.idle;
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", s.className)}>
      {s.label}
    </span>
  );
}
