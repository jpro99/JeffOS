"use client";

import Link from "next/link";
import { useMissionControl, useWorkspace } from "@/lib/store/context";
import { cn, statusColors } from "@/lib/utils";
import { RelativeTime } from "@/components/ui/RelativeTime";

export function TaskQueue({ limit = 5 }: { limit?: number }) {
  const { state, promoteTaskInQueue, focusTask } = useMissionControl();
  const { workspace, activeTask } = useWorkspace();

  const queued = workspace.queueTaskIds
    .map((id) => state.tasks.find((t) => t.id === id))
    .filter(Boolean)
    .slice(0, limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Task queue</p>
        <Link href="/tasks" className="text-[10px] text-teal-600 hover:text-teal-400">
          All
        </Link>
      </div>
      {queued.length === 0 && <p className="text-xs text-zinc-600">Queue empty</p>}
      {queued.map((task) =>
        task ? (
          <button
            key={task.id}
            type="button"
            onClick={() => {
              promoteTaskInQueue(task.id);
              focusTask(task.id);
            }}
            className={cn(
              "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition",
              activeTask?.id === task.id
                ? "border-teal-500/25 bg-teal-500/5"
                : "border-white/[0.04] bg-white/[0.02] hover:border-white/10",
            )}
          >
            <span
              className={cn(
                "mt-0.5 rounded px-1.5 py-0.5 text-[10px] capitalize",
                statusColors[task.status],
              )}
            >
              {task.status}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-300">{task.title}</p>
              <p className="text-[10px] text-zinc-600">
                <RelativeTime iso={task.updatedAt} />
              </p>
            </div>
          </button>
        ) : null,
      )}
    </div>
  );
}
