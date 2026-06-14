"use client";

import type { Project } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Badge } from "@/components/ui/Badge";

export function GodModePanel({ project }: { project: Project }) {
  const { runQuickCommand } = useMissionControl();
  const ideas = project.ops.godModeIdeas;

  const fullPrompt = `God Mode — ${project.name}

${ideas.map((g) => `Q: ${g.question}\nA: ${g.insight}`).join("\n\n")}

Jeff wants: highest leverage, world-class direction, breakthrough not incremental.
Mode: caveman. Strategy first — no code unless asked.`;

  return (
    <Card className="space-y-4 border-violet-500/10">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-violet-400/80">God Mode</p>
        <CardTitle className="mt-1">Ultimate direction</CardTitle>
        <p className="mt-1 text-sm text-zinc-500">Strategy + breakthrough ideas. Not cute — real leverage.</p>
      </div>

      {ideas.map((idea) => (
        <div key={idea.id} className="rounded-xl bg-violet-500/5 p-4 ring-1 ring-violet-500/10">
          <p className="text-sm font-medium text-zinc-200">{idea.question}</p>
          <p className="mt-2 text-sm text-zinc-400">{idea.insight}</p>
          <Badge className="mt-3 border-violet-500/20 bg-violet-500/10 text-violet-300">
            {idea.leverage} leverage
          </Badge>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <CopyButton text={fullPrompt} label="Copy God Mode session" />
        <button
          type="button"
          onClick={() => {
            const r = runQuickCommand(project.id, "ultimate-mode");
            void navigator.clipboard.writeText(r.prompt);
          }}
          className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm text-violet-200"
        >
          Ultimate Mode →
        </button>
      </div>
    </Card>
  );
}
