"use client";

import { useMissionControl, useWorkspace } from "@/lib/store/context";
import { getInterfaceLabel, getModelLabel } from "@/lib/routing/engine";
import type { InterfaceId, ModelClassId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RouteStrip({ compact }: { compact?: boolean }) {
  const { state, getBot, recomputeActiveRoute } = useMissionControl();
  const { activeRoute, routeMode, setRouteOverride } = useWorkspace();

  if (!activeRoute) {
    return (
      <button
        type="button"
        onClick={recomputeActiveRoute}
        className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-zinc-500 hover:border-teal-500/30 hover:text-teal-400"
      >
        Compute route
      </button>
    );
  }

  const bot = getBot(activeRoute.botId);

  const ifaceBtn = (id: InterfaceId, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setRouteOverride({ interface: id })}
      className={cn(
        "rounded-lg px-2.5 py-1 text-xs font-medium transition",
        activeRoute.interface === id
          ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
      )}
    >
      {label}
    </button>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] p-1">
        {ifaceBtn("cursor", "Cursor")}
        {ifaceBtn("claude-code", "Code")}
        {ifaceBtn("regular-claude", "Claude")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-zinc-600">Active route</p>
        <span className="text-[10px] text-zinc-600">{routeMode === "auto" ? "Auto" : "Manual"}</span>
      </div>

      <p className="mb-3 text-xs text-zinc-500">Interface</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {state.interfaces.map((i) => ifaceBtn(i.id, i.name.split(" ")[0]))}
      </div>

      <p className="mb-2 text-xs text-zinc-500">Model</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {(["cheap-fast", "balanced", "code-heavy", "planning-heavy", "autonomous-heavy"] as ModelClassId[]).map(
          (id) => (
            <button
              key={id}
              type="button"
              onClick={() => setRouteOverride({ modelClass: id })}
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] transition",
                activeRoute.modelClass === id ? "bg-white/10 text-zinc-200" : "text-zinc-600 hover:text-zinc-400",
              )}
            >
              {getModelLabel(id, state.modelClasses).split(" ")[0]}
            </button>
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
        <span className="rounded-md bg-black/20 px-2 py-1">{bot?.name ?? activeRoute.botType}</span>
        <span className="rounded-md bg-black/20 px-2 py-1">
          {getInterfaceLabel(activeRoute.interface, state.interfaces)}
        </span>
      </div>

      {routeMode === "manual" && (
        <button
          type="button"
          onClick={recomputeActiveRoute}
          className="mt-3 text-[10px] text-teal-600 hover:text-teal-400"
        >
          Reset to auto →
        </button>
      )}
    </div>
  );
}
