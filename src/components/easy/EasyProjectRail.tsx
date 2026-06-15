"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function EasyProjectRail({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/easy/projects/${projectId}`;
  const onWork = pathname === base;
  const onSettings = pathname === `${base}/settings`;

  const items = [
    { href: base, label: "Work", icon: "◉", active: onWork },
    { href: `${base}/settings`, label: "Settings", icon: "⚙", active: onSettings },
  ];

  return (
    <>
      <aside className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 flex border-t border-white/[0.06] bg-[#0a0b0e]/95 backdrop-blur-xl md:bottom-0 md:left-0 md:right-auto md:top-[var(--easy-header-offset,9rem)] md:w-16 md:flex-col md:border-r md:border-t-0">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-[10px] transition md:flex-none md:py-5",
              item.active
                ? "bg-teal-500/15 text-teal-200 ring-1 ring-inset ring-teal-500/25"
                : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </aside>
      <div className="hidden h-0 w-16 shrink-0 md:block" aria-hidden />
    </>
  );
}
