"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useVoice } from "@/components/voice/VoiceProvider";

const items = [
  { href: "/", icon: "◉", label: "Home" },
  { href: "/projects", icon: "◫", label: "Projects" },
  { action: "command", icon: "⌘", label: "Command" },
  { action: "voice", icon: "🎙", label: "Voice" },
  { href: "/tasks", icon: "☑", label: "Tasks" },
];

interface DockProps {
  onCommand: () => void;
}

export function Dock({ onCommand }: DockProps) {
  const pathname = usePathname();
  const { openPanel } = useVoice();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#0e1014]/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
      <ul className="mx-auto flex max-w-md items-end justify-around">
        {items.map((item) => {
          if (item.action === "command") {
            return (
              <li key={item.action}>
                <button
                  type="button"
                  onClick={onCommand}
                  className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-teal-400"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/20 text-lg ring-1 ring-teal-500/30">
                    {item.icon}
                  </span>
                  <span className="text-[10px]">{item.label}</span>
                </button>
              </li>
            );
          }
          if (item.action === "voice") {
            return (
              <li key={item.action}>
                <div className="flex flex-col items-center gap-0.5 px-2 py-1.5">
                  <VoiceMicButton compact className="h-12 w-12" />
                  <span className="text-[10px] text-zinc-500">{item.label}</span>
                </div>
              </li>
            );
          }
          const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href!));
          return (
            <li key={item.href}>
              <Link
                href={item.href!}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5",
                  active ? "text-teal-300" : "text-zinc-500",
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={openPanel} className="sr-only">
        Open voice panel
      </button>
    </nav>
  );
}
