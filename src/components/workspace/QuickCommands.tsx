"use client";

import { useState } from "react";
import type { Project, QuickCommandId } from "@/lib/types";
import { useMissionControl } from "@/lib/store/context";
import { QUICK_COMMANDS, getCommandLabel } from "@/lib/intelligence/commands";
import { QuickActionPanel } from "@/components/workspace/QuickActionPanel";
import { scrollToPasteFix } from "@/lib/intelligence/quick-action-guide";
import { cn } from "@/lib/utils";

interface QuickCommandsProps {
  project: Project;
  commands?: readonly QuickCommandId[];
  compact?: boolean;
  onRun?: (label: string) => void;
}

export function QuickCommands({ project, commands, compact, onRun }: QuickCommandsProps) {
  const { runQuickCommand } = useMissionControl();
  const [activeCommand, setActiveCommand] = useState<QuickCommandId | null>(null);
  const list = commands ?? QUICK_COMMANDS.slice(0, compact ? 6 : 10);

  const run = (id: QuickCommandId) => {
    runQuickCommand(project.id, id);
    setActiveCommand(id);
    onRun?.(getCommandLabel(id));
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
        Tap a button — Jeff OS shows what to do next (not just copy silently)
      </p>
      <div className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
        <button
          type="button"
          onClick={scrollToPasteFix}
          className={cn(
            "rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20",
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
          )}
        >
          Paste &amp; fix
        </button>
        {list.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => run(id)}
            className={cn(
              "rounded-full border transition",
              compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              activeCommand === id
                ? "border-teal-400/50 bg-teal-500/20 text-teal-100 ring-1 ring-teal-500/30"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-200",
              (id === "god-mode" || id === "ultimate-mode") &&
                activeCommand !== id &&
                "border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-200",
              (id === "fix-errors" || id === "fix-next-issue" || id === "what-to-do") &&
                activeCommand !== id &&
                "border-amber-500/15 hover:bg-amber-500/10",
              id === "what-to-do" &&
                "border-teal-500/25 bg-teal-500/[0.08] font-medium text-teal-100",
            )}
          >
            {getCommandLabel(id)}
          </button>
        ))}
      </div>

      {activeCommand && (
        <QuickActionPanel
          project={project}
          commandId={activeCommand}
          onClose={() => setActiveCommand(null)}
        />
      )}
    </div>
  );
}
