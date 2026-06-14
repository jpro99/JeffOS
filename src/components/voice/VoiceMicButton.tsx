"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@/components/voice/VoiceProvider";

interface VoiceMicButtonProps {
  compact?: boolean;
  className?: string;
  label?: string;
}

export function VoiceMicButton({ compact, className, label }: VoiceMicButtonProps) {
  const {
    phase,
    isListening,
    isTranscribing,
    voiceEnabled,
    voiceMode,
    startListening,
    stopListening,
    openPanel,
  } = useVoice();

  const active = isListening || isTranscribing || phase === "processing";

  const statusLabel =
    phase === "listening"
      ? "Listening…"
      : phase === "transcribing"
        ? "Transcribing…"
        : phase === "processing"
          ? "Processing…"
          : label ?? "Voice";

  if (voiceMode === "push-to-talk") {
    return (
      <button
        type="button"
        title={voiceEnabled ? "Hold to talk" : "Voice off — open panel"}
        aria-label={statusLabel}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!voiceEnabled) {
            openPanel();
            return;
          }
          startListening();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          if (isListening) stopListening();
        }}
        onPointerCancel={() => {
          if (isListening) stopListening();
        }}
        onClick={(e) => e.preventDefault()}
        className={cn(
          "relative flex touch-none select-none items-center justify-center rounded-full border transition",
          active
            ? "border-rose-500/40 bg-rose-500/15 text-rose-200 shadow-lg shadow-rose-500/20"
            : "border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-200",
          compact ? "h-10 w-10 text-base" : "h-11 w-11 text-lg",
          className,
        )}
      >
        {active && (
          <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" aria-hidden />
        )}
        <span className="relative">🎙</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      title={voiceEnabled ? "Tap to talk" : "Voice off — open panel"}
      aria-label={statusLabel}
      onClick={() => {
        if (!voiceEnabled) {
          openPanel();
          return;
        }
        if (isListening) stopListening();
        else startListening();
      }}
      className={cn(
        "relative flex items-center justify-center rounded-full border transition",
        active
          ? "border-rose-500/40 bg-rose-500/15 text-rose-200 shadow-lg shadow-rose-500/20"
          : "border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-200",
        compact ? "h-10 w-10 text-base" : "h-11 w-11 text-lg",
        className,
      )}
    >
      {active && (
        <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" aria-hidden />
      )}
      <span className="relative">🎙</span>
    </button>
  );
}
