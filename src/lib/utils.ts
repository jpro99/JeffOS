export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function formatStableDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatStableDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatStableDate(iso);
}

export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy copy */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const priorityColors: Record<string, string> = {
  P0: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  P1: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  P2: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  P3: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

export const statusColors: Record<string, string> = {
  active: "text-teal-400 bg-teal-500/10",
  prototype: "text-sky-400 bg-sky-500/10",
  paused: "text-zinc-400 bg-zinc-500/10",
  idea: "text-violet-400 bg-violet-500/10",
  mature: "text-emerald-400 bg-emerald-500/10",
  planned: "text-zinc-400 bg-zinc-500/10",
  ready: "text-teal-400 bg-teal-500/10",
  running: "text-amber-400 bg-amber-500/10",
  blocked: "text-rose-400 bg-rose-500/10",
  review: "text-sky-400 bg-sky-500/10",
  done: "text-emerald-400 bg-emerald-500/10",
};
