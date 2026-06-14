import type { AppSettings, ExperienceLevel } from "@/lib/types";

export const EXPERIENCE_LEVELS: {
  id: ExperienceLevel;
  label: string;
  tagline: string;
  detail: string;
}[] = [
  {
    id: "new",
    label: "New",
    tagline: "Show me what to push",
    detail: "Minimal menus. Big buttons. Step-by-step missions.",
  },
  {
    id: "comfortable",
    label: "Comfortable",
    tagline: "I get the idea",
    detail: "Projects + tasks + bots. Hide deep routing tools.",
  },
  {
    id: "expert",
    label: "Expert",
    tagline: "Give me everything",
    detail: "Full Jeff OS — route, compose, all panels.",
  },
];

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  hint?: string;
};

const ALL_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "◉", hint: "Dashboard + next action" },
  { href: "/projects", label: "Projects", icon: "◫", hint: "Pick what to work on" },
  { href: "/bots", label: "Bots", icon: "◎", hint: "AI roles and prompts" },
  { href: "/tasks", label: "Tasks", icon: "☑", hint: "Work queue — optional in Easy Mode" },
  {
    href: "/prompt-builder",
    label: "Compose",
    icon: "✎",
    hint: "Build custom prompts — experts only",
  },
  { href: "/routing", label: "Route", icon: "⇄", hint: "Model + bot routing — experts only" },
  { href: "/settings", label: "Settings", icon: "⚙", hint: "Defaults and discovery" },
];

const NAV_BY_LEVEL: Record<ExperienceLevel, string[]> = {
  new: ["/", "/projects", "/settings"],
  comfortable: ["/", "/projects", "/bots", "/tasks", "/settings"],
  expert: ALL_NAV.map((n) => n.href),
};

export function navForExperience(level: ExperienceLevel): NavItem[] {
  const allowed = new Set(NAV_BY_LEVEL[level]);
  return ALL_NAV.filter((n) => allowed.has(n.href));
}

export function showGettingStarted(settings: AppSettings): boolean {
  return settings.experienceLevel === "new" && settings.uiMode === "classic";
}

export const CLASSIC_START_STEPS = [
  {
    step: 1,
    title: "Pick a project",
    body: "Projects → open one (Kepi, Bankruptcy, etc.)",
    href: "/projects",
  },
  {
    step: 2,
    title: "Say what you want",
    body: "Scope & Orchestra tab — type goal, add features",
    href: "/projects",
  },
  {
    step: 3,
    title: "Plan + launch",
    body: "Generate plan → Approve → copy prompt to Cursor",
    href: "/easy",
  },
];

export const EASY_START_STEPS = [
  { step: 1, title: "Pick project", body: "Tap a project card" },
  { step: 2, title: "Read snapshot", body: "Folder scan — built, not built, connected, scope" },
  { step: 3, title: "Say what's next", body: 'One box after you read the brief' },
  { step: 4, title: "Plan + Launch", body: "Bots plan → copy to Cursor" },
  { step: 5, title: "Mark done", body: "Check off as agent finishes" },
];

export function botPhaseLabel(phase: string): string {
  const key = phase
    .replace(/-risk-bot$/i, "")
    .replace(/-bot$/i, "")
    .replace(/^security-risk$/i, "security")
    .replace(/^project-god$/i, "god")
    .replace(/^control-tower$/i, "control");
  const map: Record<string, string> = {
    spec: "Planner",
    architect: "Architect",
    build: "Builder",
    test: "Tester",
    security: "Security",
    docs: "Docs",
    integration: "Integration",
    god: "God Bot",
    control: "Control Tower",
  };
  return map[key] ?? key;
}
