"use client";

import Link from "next/link";
import { CLASSIC_START_STEPS, showGettingStarted } from "@/lib/ui/experience";
import { useMissionControl } from "@/lib/store/context";

export function StartHerePanel() {
  const { state } = useMissionControl();
  if (!showGettingStarted(state.settings)) return null;

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/90">
            New here? Start here
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">You don&apos;t need every tab yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Tasks, Route, and Compose are power tools. Try{" "}
            <Link href="/easy" className="text-teal-500 hover:underline">
              Easy Mode
            </Link>{" "}
            first — same data, fewer buttons.
          </p>
        </div>
        <Link
          href="/easy"
          className="shrink-0 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
        >
          Try Easy Mode
        </Link>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {CLASSIC_START_STEPS.map((s) => (
          <li key={s.step} className="rounded-xl bg-black/20 px-4 py-3">
            <p className="text-xs font-semibold text-zinc-400">Step {s.step}</p>
            <p className="mt-1 text-sm font-medium text-zinc-200">{s.title}</p>
            <p className="mt-1 text-xs text-zinc-600">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
