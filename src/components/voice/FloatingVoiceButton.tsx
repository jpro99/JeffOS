"use client";

import { usePathname } from "next/navigation";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useVoice } from "@/components/voice/VoiceProvider";
import { cn } from "@/lib/utils";

export function FloatingVoiceButton() {
  const pathname = usePathname();
  const { openPanel, phase } = useVoice();
  const active = phase === "listening" || phase === "transcribing";

  if (pathname.startsWith("/easy")) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8">
      <VoiceMicButton
        compact
        className={cn("h-14 w-14 text-xl shadow-xl shadow-black/40", active && "scale-105")}
      />
      <button
        type="button"
        onClick={openPanel}
        className="mt-2 hidden w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 md:block"
      >
        Voice panel
      </button>
    </div>
  );
}
