"use client";

import { useState } from "react";
import { useMissionControl } from "@/lib/store/context";
import { resolveQuickCommand } from "@/lib/intelligence/commands";
import { copyToClipboard } from "@/lib/utils";

const VISION_GOD_PROMPT = `God Mode — Jeff OS product vision

Question: Is this the DOS → Windows leap for developers? Can Jeff OS become mainstream — install, import projects, God Mode for anyone?

Jeff wants:
- Mix Mac clarity + Windows directness
- Install and import — not Jeff-only paths
- Full God Mode for normal users
- Transform programming tools into something anyone can run

Think breakthrough product architecture — not incremental UI tweaks.
Deliver: 1-page product vision + 5 shipped UX changes ranked by impact.
Mode: caveman. Strategy + concrete build list.`;

export function EasyGodModeQuick({ projectId }: { projectId?: string }) {
  const { state, runQuickCommand } = useMissionControl();
  const [msg, setMsg] = useState<string | null>(null);

  const project =
    state.projects.find((p) => p.id === (projectId ?? state.workspace.activeProjectId)) ??
    state.projects.find((p) => p.id === "proj-jeff-os") ??
    state.projects[0];

  const copyGod = async (useVision = false) => {
    if (!project && !useVision) {
      setMsg("Pick a project first");
      return;
    }
    const text = useVision
      ? VISION_GOD_PROMPT
      : runQuickCommand(project!.id, "ultimate-mode").prompt;
    const ok = await copyToClipboard(text);
    setMsg(ok ? "God Mode copied — paste in Cursor or Claude" : "Copy blocked — select text manually");
  };

  return (
    <section className="space-y-3 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent p-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">God Mode</p>
      <h2 className="text-lg font-semibold text-zinc-100">Think bigger — one copy</h2>
      <p className="text-sm text-zinc-500">
        Strategy session, not code soup. {project ? `Active: ${project.name}` : "Jeff OS vision below."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyGod(true)}
          className="rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-400"
        >
          Copy God Mode — mainstream vision
        </button>
        {project && (
          <button
            type="button"
            onClick={() => void copyGod(false)}
            className="rounded-full border border-violet-500/30 px-4 py-2.5 text-sm text-violet-200"
          >
            Copy God Mode — {project.name}
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-violet-300">{msg}</p>}
    </section>
  );
}
