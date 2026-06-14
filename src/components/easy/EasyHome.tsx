"use client";

import Link from "next/link";
import { EASY_START_STEPS } from "@/lib/ui/experience";
import { ExperiencePicker } from "@/components/easy/ExperiencePicker";
import { EasyImportHub } from "@/components/easy/EasyImportHub";
import { EasyGodModeQuick } from "@/components/easy/EasyGodModeQuick";
import { useMissionControl } from "@/lib/store/context";

export function EasyHome() {
  const { state } = useMissionControl();
  const projectCount = state.projects.length;

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-3xl border border-white/[0.06] bg-gradient-to-b from-teal-500/[0.07] via-transparent to-violet-500/[0.04] p-8 shadow-2xl shadow-black/30">
        <p className="text-sm font-medium text-teal-400/90">DOS → Windows moment for your code</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Install. Import. Command. Ship.
        </h1>
        <p className="max-w-lg text-base leading-relaxed text-zinc-400">
          Jeff Mission Control — Mac calm, Windows direct. Point at your projects folder, talk to Mission Control,
          copy one prompt into Cursor. God Mode included.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/easy/projects"
            className="rounded-full bg-teal-500 px-6 py-3 text-sm font-semibold text-black hover:bg-teal-400"
          >
            Open projects ({projectCount})
          </Link>
          <a
            href="#import-projects"
            className="rounded-full border border-white/15 bg-white/[0.05] px-6 py-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.08]"
          >
            Import from disk
          </a>
        </div>
      </section>

      <div id="import-projects">
        <EasyImportHub />
      </div>

      <EasyGodModeQuick />

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-sm font-semibold text-zinc-300">Three moves — anyone can do this</h2>
        <ol className="mt-4 space-y-4">
          {EASY_START_STEPS.slice(0, 3).map((s) => (
            <li key={s.step} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-sm font-semibold text-teal-300">
                {s.step}
              </span>
              <div>
                <p className="font-medium text-zinc-200">{s.title}</p>
                <p className="text-sm text-zinc-500">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-zinc-600">
          Builder Hub at top → <strong className="text-zinc-400">Tell me what you need. I&apos;ll build it.</strong>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400">Your experience level</h2>
        <ExperiencePicker />
      </section>
    </div>
  );
}
