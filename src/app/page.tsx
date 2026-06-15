"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";

/** Default entry: Easy Work (matches localhost `/easy/projects/...`), not Classic dashboard. */
export default function HomePage() {
  const router = useRouter();
  const { hydrated, state } = useMissionControl();

  useEffect(() => {
    if (!hydrated) return;
    const active =
      state.workspace.activeProjectId ??
      state.workspace.recentProjectIds.find((id) => state.projects.some((p) => p.id === id)) ??
      state.projects[0]?.id;
    router.replace(active ? `/easy/projects/${active}` : "/easy/projects");
  }, [hydrated, state.workspace.activeProjectId, state.workspace.recentProjectIds, state.projects, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
      Opening Jeff OS…
    </div>
  );
}
