"use client";

import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { ExperiencePicker } from "@/components/easy/ExperiencePicker";

export default function EasySettingsPage() {
  const { state, updateSettings } = useMissionControl();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">About you</h1>
        <p className="mt-1 text-sm text-zinc-500">Pick level — affects Classic sidebar, not the Easy buttons.</p>
      </div>

      <ExperiencePicker />

      <section className="space-y-3 rounded-2xl border border-white/[0.08] p-5">
        <h2 className="text-sm font-semibold text-zinc-300">Compare modes</h2>
        <p className="text-sm text-zinc-500">
          Easy and Classic share the same projects and plans. Switch anytime.
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full bg-teal-500/15 px-4 py-2 text-sm text-teal-200 ring-1 ring-teal-500/25">
            You are in Easy Mode
          </span>
          <Link
            href="/"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            Open Classic view
          </Link>
        </div>
        <button
          type="button"
          onClick={() => updateSettings({ uiMode: "classic" })}
          className="text-xs text-zinc-600 hover:text-zinc-400"
        >
          Set default startup to Classic
        </button>
      </section>

      <p className="text-xs text-zinc-600">
        Level: <strong className="text-zinc-500">{state.settings.experienceLevel}</strong>
      </p>
    </div>
  );
}
