import type { MissionControlState } from "@/lib/types";

export interface SearchResult {
  id: string;
  kind: "project" | "bot" | "task" | "page" | "action";
  title: string;
  subtitle: string;
  href?: string;
  action?: string;
  score: number;
}

const pages = [
  { id: "page-home", title: "Home", href: "/", keywords: "desktop workspace" },
  { id: "page-projects", title: "Projects", href: "/projects", keywords: "portfolio" },
  { id: "page-bots", title: "Bots", href: "/bots", keywords: "agents fleet" },
  { id: "page-tasks", title: "Tasks", href: "/tasks", keywords: "queue orchestration" },
  { id: "page-compose", title: "Compose", href: "/prompt-builder", keywords: "prompt builder packet" },
  { id: "page-route", title: "Route", href: "/routing", keywords: "routing engine interface model" },
  { id: "page-settings", title: "Settings", href: "/settings", keywords: "preferences jeff mode" },
];

const actions = [
  { id: "act-compose", title: "Compose prompt packet", href: "/prompt-builder", keywords: "new prompt" },
  { id: "act-route", title: "Open routing engine", href: "/routing", keywords: "decide interface bot" },
  { id: "act-task", title: "New task", href: "/tasks", keywords: "create task queue" },
];

function matchScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 50;
  const words = q.split(/\s+/);
  if (words.every((w) => t.includes(w))) return 40;
  return 0;
}

export function unifiedSearch(query: string, state: MissionControlState): SearchResult[] {
  const results: SearchResult[] = [];

  for (const p of state.projects) {
    const text = `${p.name} ${p.type} ${p.description} ${p.stack.join(" ")}`;
    const score = matchScore(query, text);
    if (score > 0)
      results.push({
        id: p.id,
        kind: "project",
        title: p.name,
        subtitle: `${p.priority} · ${p.status}`,
        href: `/projects/${p.id}`,
        score,
      });
  }

  for (const b of state.bots) {
    const text = `${b.name} ${b.role} ${b.description} ${b.type}`;
    const score = matchScore(query, text);
    if (score > 0)
      results.push({
        id: b.id,
        kind: "bot",
        title: b.name,
        subtitle: b.role,
        href: "/bots",
        score: score - 5,
      });
  }

  for (const t of state.tasks) {
    const proj = state.projects.find((p) => p.id === t.projectId);
    const text = `${t.title} ${t.description} ${t.taskType} ${proj?.name ?? ""}`;
    const score = matchScore(query, text);
    if (score > 0)
      results.push({
        id: t.id,
        kind: "task",
        title: t.title,
        subtitle: `${t.status} · ${proj?.name ?? ""}`,
        href: "/tasks",
        score,
      });
  }

  for (const pg of pages) {
    const score = matchScore(query, `${pg.title} ${pg.keywords}`);
    if (score > 0)
      results.push({
        id: pg.id,
        kind: "page",
        title: pg.title,
        subtitle: "Open",
        href: pg.href,
        score: score - 10,
      });
  }

  for (const a of actions) {
    const score = matchScore(query, `${a.title} ${a.keywords}`);
    if (score > 0)
      results.push({
        id: a.id,
        kind: "action",
        title: a.title,
        subtitle: "Quick action",
        href: a.href,
        score: score - 8,
      });
  }

  if (!query.trim()) {
    return [
      ...state.projects.slice(0, 3).map((p) => ({
        id: p.id,
        kind: "project" as const,
        title: p.name,
        subtitle: "Recent project",
        href: `/projects/${p.id}`,
        score: 90,
      })),
      ...pages.slice(0, 4).map((pg) => ({
        id: pg.id,
        kind: "page" as const,
        title: pg.title,
        subtitle: "Go",
        href: pg.href,
        score: 70,
      })),
    ];
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}
