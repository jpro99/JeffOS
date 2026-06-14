"use client";

import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { ExperiencePicker } from "@/components/easy/ExperiencePicker";
import { EasyOnlineAccess } from "@/components/easy/EasyOnlineAccess";
import { normalizePublicUrl } from "@/lib/deploy/online-access";

export default function EasySettingsPage() {
  const { state, updateSettings } = useMissionControl();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">About you</h1>
        <p className="mt-1 text-sm text-zinc-500">Pick level — affects Classic sidebar, not the Easy buttons.</p>
      </div>

      <ExperiencePicker />

      <EasyOnlineAccess />

      <section className="space-y-3 rounded-2xl border border-white/[0.08] p-5">
        <h2 className="text-sm font-semibold text-zinc-300">Production URL</h2>
        <p className="text-sm text-zinc-500">After Vercel deploy — paste URL so Jeff OS links work from phone.</p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            updateSettings({ productionUrl: normalizePublicUrl(String(fd.get("url") ?? "")) });
          }}
        >
          <input
            name="url"
            defaultValue={state.settings.productionUrl ?? ""}
            placeholder="jeff-os.vercel.app"
            className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300"
          />
          <button type="submit" className="rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-black">
            Save
          </button>
        </form>
      </section>

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
