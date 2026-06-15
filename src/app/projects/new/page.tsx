"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Classic route — sends Jeff to the Easy step wizard */
export default function NewProjectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/easy/new");
  }, [router]);
  return (
    <p className="text-sm text-zinc-500">Opening new application wizard…</p>
  );
}
