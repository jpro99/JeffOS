"use client";

import { JEFF_OS_DOCS_LABEL, JEFF_OS_DOCS_REL, JEFF_OS_NAME } from "@/lib/jeff-os/branding";

/** One-line map so Jeff always knows what Jeff OS is vs docs vs other projects */
export function JeffOsStructureHint({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[10px] text-zinc-600">
        <strong className="text-zinc-500">{JEFF_OS_NAME}</strong> = this app ·{" "}
        <strong className="text-zinc-500">{JEFF_OS_DOCS_LABEL}</strong> = notes inside it (
        <span className="font-mono">{JEFF_OS_DOCS_REL}/</span>)
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">
      <p className="font-medium text-zinc-400">Everything is {JEFF_OS_NAME}</p>
      <ul className="mt-2 space-y-1">
        <li>
          · <strong className="text-zinc-400">{JEFF_OS_NAME}</strong> — the app you run (
          <span className="font-mono text-zinc-600">npm run dev</span>)
        </li>
        <li>
          · <strong className="text-zinc-400">{JEFF_OS_DOCS_LABEL}</strong> — markdown brains inside the app (
          <span className="font-mono text-zinc-600">{JEFF_OS_DOCS_REL}/</span>)
        </li>
        <li>
          · <strong className="text-zinc-400">Your other apps</strong> — separate folders (Nurse Practitioner Study, etc.)
          managed from Projects
        </li>
      </ul>
    </div>
  );
}
