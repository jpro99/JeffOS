"use client";

import { useMissionControl } from "@/lib/store/context";
import { EXPERIENCE_LEVELS } from "@/lib/ui/experience";
import type { ExperienceLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExperiencePicker({ compact }: { compact?: boolean }) {
  const { state, updateSettings } = useMissionControl();
  const level = state.settings.experienceLevel;

  const pick = (id: ExperienceLevel) => updateSettings({ experienceLevel: id });

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {EXPERIENCE_LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => pick(l.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition",
              level === l.id
                ? "bg-white/[0.08] text-zinc-200 ring-1 ring-white/10"
                : "text-zinc-600 hover:text-zinc-400",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {EXPERIENCE_LEVELS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => pick(l.id)}
          className={cn(
            "rounded-2xl border p-4 text-left transition",
            level === l.id
              ? "border-teal-500/30 bg-teal-500/10 ring-1 ring-teal-500/20"
              : "border-white/[0.06] bg-white/[0.02] hover:border-white/10",
          )}
        >
          <p className="font-semibold text-zinc-100">{l.label}</p>
          <p className="mt-1 text-sm text-teal-400/90">{l.tagline}</p>
          <p className="mt-2 text-xs text-zinc-500">{l.detail}</p>
        </button>
      ))}
    </div>
  );
}
