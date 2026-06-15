"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMissionControl } from "@/lib/store/context";
import { ExperiencePicker } from "@/components/easy/ExperiencePicker";
import { EasyBuilderHub } from "@/components/easy/EasyBuilderHub";
import { EasyGuidedJourney } from "@/components/easy/EasyGuidedJourney";
import { EasyOnlineAccess } from "@/components/easy/EasyOnlineAccess";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";

const easyNav = [
  { href: "/easy", label: "Start", icon: "◉" },
  { href: "/easy/projects", label: "Projects", icon: "◫" },
  { href: "/easy/settings", label: "You", icon: "◎" },
];

export function EasyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useMissionControl();
  const isNewWizard = pathname.startsWith("/easy/new");

  return (
    <div className="min-h-screen bg-[#0a0b0e] bg-[radial-gradient(ellipse_at_top,_rgba(20,184,166,0.08)_0%,_transparent_50%)] text-zinc-100 pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0b0e]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/25">
              ◆
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">Jeff OS</p>
              <p className="text-sm font-semibold text-zinc-200">Jeff Mission Control</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-wrap gap-1">
            {easyNav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/easy" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-sm transition min-h-[44px] min-w-[44px] flex items-center justify-center",
                    active
                      ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/25"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <VoiceMicButton compact />
            <Link
              href="/"
              className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Classic view
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <ExperiencePicker compact />
        </div>
      </header>

      <EasyOnlineAccess compact />

      {!isNewWizard && (
        <>
          <div id="builder-hub">
            <EasyBuilderHub />
          </div>
          <EasyGuidedJourney />
        </>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8 pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-white/[0.05] bg-[#0a0b0e]/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[10px] text-zinc-600">
        Same data as Classic · level: {state.settings.experienceLevel}
      </footer>
    </div>
  );
}
