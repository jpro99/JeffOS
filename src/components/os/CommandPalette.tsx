"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { unifiedSearch, type SearchResult } from "@/lib/os/search";
import { useMissionControl } from "@/lib/store/context";
import { VoiceMicButton } from "@/components/voice/VoiceMicButton";
import { useVoice } from "@/components/voice/VoiceProvider";
import { cn } from "@/lib/utils";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette requires CommandPaletteProvider");
  return ctx;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { state, switchProject, focusTask, addActivity } = useMissionControl();
  const { openPanel: openVoicePanel } = useVoice();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = unifiedSearch(query, state);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const run = (item: SearchResult) => {
    if (item.kind === "project") switchProject(item.id);
    if (item.kind === "task") focusTask(item.id);
    if (item.href) router.push(item.href);
    const activityType =
      item.kind === "action" || item.kind === "page"
        ? "routing"
        : item.kind === "bot"
          ? "bot"
          : item.kind === "task"
            ? "task"
            : item.kind === "project"
              ? "project"
              : "routing";
    addActivity(`Command: ${item.title}`, activityType, item.kind === "project" ? item.id : undefined);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[index]) {
        e.preventDefault();
        run(results[index]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, index, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14161c]/95 shadow-2xl shadow-black/50"
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
          <span className="text-zinc-600">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, bots, tasks, actions…"
            className="flex-1 bg-transparent text-base text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <VoiceMicButton compact />
          <button
            type="button"
            onClick={openVoicePanel}
            className="text-[10px] text-zinc-600 hover:text-teal-500"
          >
            Voice
          </button>
          <kbd className="hidden rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500 sm:inline">esc</kbd>
        </div>
        <ul className="max-h-[min(360px,50vh)] overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-zinc-600">No matches</li>
          )}
          {results.map((item, i) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => run(item)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition",
                  i === index ? "bg-teal-500/10" : "hover:bg-white/[0.03]",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs uppercase text-zinc-500">
                  {item.kind.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
                  <p className="truncate text-xs text-zinc-600">{item.subtitle}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-white/[0.06] px-4 py-2 text-[10px] text-zinc-600">
          ↑↓ navigate · enter open · Jeff OS
        </div>
      </div>
    </div>
  );
}
