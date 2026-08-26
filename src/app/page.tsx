"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMissionControl } from "@/lib/store/context";

/** Default entry: Talk — Grok + home PC + Cloud Agent routing. */
export default function HomePage() {
  const router = useRouter();
  const { hydrated } = useMissionControl();

  useEffect(() => {
    if (!hydrated) return;
    router.replace("/easy/talk");
  }, [hydrated, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
      Opening Talk…
    </div>
  );
}
