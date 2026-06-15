import type { InterfaceId, ModelClassId, Priority, ProjectStatus } from "@/lib/types";

/** Known Jeff portfolio — mirrors AI-COMMAND-CENTER/PROJECT_INDEX.md */
export interface CatalogEntry {
  id: string;
  name: string;
  slug: string;
  path: string;
  altPaths?: string[];
  folderHints: string[];
  type: string;
  stack: string[];
  status: ProjectStatus;
  priority: Priority;
  description: string;
  goals: string[];
  risks: string[];
  roadmap: string[];
  assignedGodBotId: string;
  workerBotIds: string[];
  preferredInterface: InterfaceId;
  preferredModelClass: ModelClassId;
  activeBotStrategy: string;
  godBotFile?: string;
  github?: string;
  skip?: boolean;
  skipReason?: string;
}

export const DEFAULT_PROJECTS_ROOT = "C:\\Projects";

export const EXTRA_SCAN_ROOTS = ["C:\\vercel generator"];

export const SKIP_FOLDER_NAMES = new Set([
  "project command",
  "test",
  "face_body_lotion",
  "bankrupty",
  "demand-generator-pro-temp",
  "node_modules",
  ".git",
  ".next",
  ".next.old",
  "jeff-mission-control",
]);

export const PROJECT_CATALOG: CatalogEntry[] = [
  {
    id: "proj-bankruptcy",
    name: "My Bankruptcy",
    slug: "my-bankruptcy",
    path: "C:\\Projects\\ChapterAI",
    altPaths: ["C:\\Projects\\Bankrupty"],
    folderHints: ["chapterai", "bankrupty", "bankruptcy", "my bankruptcy"],
    type: "Legal SaaS",
    stack: ["pnpm", "Turbo", "Next.js", "Postgres", "ChapterAI packages"],
    status: "mature",
    priority: "P0",
    description: "AI-native bankruptcy practice platform for California attorneys.",
    goals: ["Ship v0.6+ features", "Keep dev/build split clean", "E-file bridge stability"],
    risks: ["Duplicate Bankrupty folder", "Complex monorepo"],
    roadmap: ["Command center polish", "Worker reliability", "Deploy hardening"],
    assignedGodBotId: "bot-god-bankruptcy",
    workerBotIds: ["bot-builder", "bot-ai", "bot-security", "bot-deploy"],
    preferredInterface: "cursor",
    preferredModelClass: "code-heavy",
    activeBotStrategy: "God Bot + Feature/AI workers",
    godBotFile: "projects/my-bankruptcy.md",
  },
  {
    id: "proj-takeoff-pro",
    name: "Takeoff Pro",
    slug: "takeoff-pro",
    path: "C:\\Projects\\Contractor take off estimator",
    folderHints: ["contractor take off estimator", "takeoff pro", "takeoff-pro"],
    type: "Construction SaaS",
    stack: ["Next.js 15", "Prisma 7", "Supabase", "PDF.js", "Tailwind 4"],
    status: "active",
    priority: "P0",
    description: "Contractor plan takeoff and estimating — PDF upload, sheets, viewer.",
    goals: ["Stage 1 polish", "Supabase setup docs", "Stage 2 roadmap"],
    risks: ["Supabase local Docker", "Large PDF edge cases"],
    roadmap: ["Stage 2 takeoff tools", "Org billing", "Export flows"],
    assignedGodBotId: "bot-god-takeoff",
    workerBotIds: ["bot-builder", "bot-test", "bot-ux"],
    preferredInterface: "cursor",
    preferredModelClass: "code-heavy",
    activeBotStrategy: "God Bot + Feature Worker",
    godBotFile: "projects/takeoff-pro.md",
  },
  {
    id: "proj-demand-generator",
    name: "Demand Generator Pro",
    slug: "demand-generator-pro",
    path: "C:\\vercel generator",
    altPaths: ["C:\\Projects\\demand-generator-pro-temp"],
    folderHints: ["vercel generator", "demand generator", "demand-generator"],
    type: "Legal SaaS",
    stack: ["Next.js 16", "Postgres", "Vercel", "PDF/AI"],
    status: "active",
    priority: "P1",
    description: "Legal demand letter generator — matters, docs, AI extraction.",
    goals: ["Harden security", "Field capture mobile", "Reduce Vercel costs"],
    risks: ["Migration order quirks", "Duplicate local folders"],
    roadmap: ["Security pass", "Mobile polish", "Env docs cleanup"],
    assignedGodBotId: "bot-god-demand",
    workerBotIds: ["bot-pdf", "bot-ai", "bot-security", "bot-deploy"],
    preferredInterface: "cursor",
    preferredModelClass: "code-heavy",
    activeBotStrategy: "God Bot + PDF/AI workers",
    godBotFile: "projects/demand-generator-pro.md",
    github: "https://github.com/jpro99/Demand-Generator-Pro",
  },
  {
    id: "proj-dunningguard",
    name: "DunningGuard",
    slug: "dunningguard",
    path: "C:\\Projects\\DunningGuard",
    folderHints: ["dunningguard", "dunning guard"],
    type: "Micro-SaaS",
    stack: ["Next.js 16", "Supabase", "Stripe Connect", "Resend", "Vercel"],
    status: "mature",
    priority: "P1",
    description: "Recover failed Stripe subscription payments via dunning emails.",
    goals: ["Webhook hardening", "RLS audit", "Ship updates safely"],
    risks: ["Stripe webhook idempotency", "Connect edge cases"],
    roadmap: ["Security pass", "Analytics", "Onboarding polish"],
    assignedGodBotId: "bot-god-dunning",
    workerBotIds: ["bot-security", "bot-deploy", "bot-builder"],
    preferredInterface: "cursor",
    preferredModelClass: "balanced",
    activeBotStrategy: "God Bot + Security + Deploy",
    godBotFile: "projects/dunningguard.md",
  },
  {
    id: "proj-tripflow",
    name: "Kepi Travel",
    slug: "kepi-travel",
    path: "C:\\Projects\\Kepi Travel\\kepi-travel",
    folderHints: ["kepi travel", "kepi-travel", "tripflow", "roamwise", "kepi-travel-reborn"],
    type: "Travel Platform",
    stack: ["Next.js", "MapLibre", "Clerk", "Redis", "Capacitor"],
    status: "active",
    priority: "P1",
    description: "Travel assistant — trips, maps, ops, mobile.",
    goals: ["Build before push", "Consolidate forks", "Ops control"],
    risks: ["Failed Vercel builds cost money", "Multiple repo folders"],
    roadmap: ["Build gate CI", "Offline outbox", "Mobile notifications"],
    assignedGodBotId: "bot-god-travel",
    workerBotIds: ["bot-builder", "bot-test", "bot-deploy"],
    preferredInterface: "claude-code",
    preferredModelClass: "autonomous-heavy",
    activeBotStrategy: "God Bot + build gate",
    godBotFile: "projects/kepi-travel.md",
  },
  {
    id: "proj-kepi-search",
    name: "Kepi Search",
    slug: "kepi-search",
    path: "C:\\Projects\\Kepi Search\\kepi-search",
    folderHints: ["kepi search", "kepi-search"],
    type: "Travel / Maps",
    stack: ["Next.js", "MapLibre", "Turf", "Terra Draw"],
    status: "active",
    priority: "P2",
    description: "Personal hotel map explorer — draw area, search hotels.",
    goals: ["City seed scripts", "Map UX polish", "Performance pass"],
    risks: ["Map API costs", "Seed data maintenance"],
    roadmap: ["More cities", "Save searches", "Mobile layout"],
    assignedGodBotId: "bot-god-kepi-search",
    workerBotIds: ["bot-builder", "bot-ux"],
    preferredInterface: "cursor",
    preferredModelClass: "balanced",
    activeBotStrategy: "God Bot + Feature Worker",
    godBotFile: "projects/kepi-search.md",
  },
  {
    id: "proj-edgar",
    name: "All In One Edgar",
    slug: "all-in-one-edgar",
    path: "C:\\Projects\\All In One Edgar",
    folderHints: ["all in one edgar", "edgar", "all-in-one-edgar"],
    type: "Infra / .NET",
    stack: [".NET", "Docker", "NAS deploy", "Entra auth"],
    status: "active",
    priority: "P2",
    description: "Sign-in web app + PC agents for remote office ops. NAS Docker deploy.",
    goals: ["NAS deploy stability", "Agent updates", "Auth hardening"],
    risks: ["NAS-specific paths", "Multi-machine agents"],
    roadmap: ["Deploy docs", "Agent health", "Monitoring"],
    assignedGodBotId: "bot-god-edgar",
    workerBotIds: ["bot-deploy", "bot-security"],
    preferredInterface: "regular-claude",
    preferredModelClass: "planning-heavy",
    activeBotStrategy: "God Bot + Deploy Worker",
    godBotFile: "projects/all-in-one-edgar.md",
  },
  {
    id: "proj-home-compass",
    name: "Home Compass",
    slug: "home-compass",
    path: "C:\\Projects\\household-compass",
    folderHints: ["household-compass", "home compass", "home-compass"],
    type: "Consumer / Family",
    stack: ["Next.js 15", "Supabase", "Tailwind"],
    status: "active",
    priority: "P2",
    description: "Household continuity — emergency, vault, money, family.",
    goals: ["Mobile emergency UX", "Supabase sync hardening"],
    risks: ["PII sensitivity"],
    roadmap: ["Family cloud", "Emergency quick flow", "PIN security"],
    assignedGodBotId: "bot-god-compass",
    workerBotIds: ["bot-ux", "bot-security"],
    preferredInterface: "cursor",
    preferredModelClass: "balanced",
    activeBotStrategy: "God Bot + Feature worker",
    godBotFile: "projects/home-compass.md",
  },
  {
    id: "proj-general-dev",
    name: "Language Translator",
    slug: "language-translator",
    path: "C:\\Projects\\language app",
    folderHints: ["language app", "language translator", "language-translator"],
    type: "Utilities",
    stack: ["Vite", "React", "PWA"],
    status: "prototype",
    priority: "P3",
    description: "Speech + translation PWA — personal utility.",
    goals: ["Speech UX", "Offline cache", "Keep lightweight"],
    risks: ["Low priority neglect"],
    roadmap: ["PWA polish", "Icon refresh"],
    assignedGodBotId: "bot-god-general",
    workerBotIds: ["bot-builder", "bot-debug"],
    preferredInterface: "cursor",
    preferredModelClass: "cheap-fast",
    activeBotStrategy: "Fix worker only",
    godBotFile: "projects/language-translator.md",
  },
  {
    id: "proj-story-pals",
    name: "Story Pals",
    slug: "story-pals",
    path: "C:\\Projects\\Story Pals",
    folderHints: ["story pals", "story-pals", "story_pals"],
    type: "Mobile / Flutter",
    stack: ["Flutter"],
    status: "prototype",
    priority: "P3",
    description: "Early Flutter app — story/social concept.",
    goals: ["Clarify product goal", "First playable demo"],
    risks: ["Scope unclear"],
    roadmap: ["Product spec", "Core loop", "UI shell"],
    assignedGodBotId: "bot-god-story-pals",
    workerBotIds: ["bot-spec", "bot-ux"],
    preferredInterface: "regular-claude",
    preferredModelClass: "planning-heavy",
    activeBotStrategy: "Spec first — then build",
    godBotFile: "projects/story-pals.md",
    github: "https://github.com/jpro99/Story-Pals",
  },
  {
    id: "proj-takeoff-staging",
    name: "Takeoff Staging",
    slug: "contractor-takeoff-staging",
    path: "C:\\Projects\\contractor-takeoff-staging",
    folderHints: ["contractor-takeoff-staging", "takeoff staging"],
    type: "Staging shell",
    stack: ["Next.js 15"],
    status: "prototype",
    priority: "P3",
    description: "Staging/spike shell — not main Takeoff Pro codebase.",
    goals: ["Spike experiments only"],
    risks: ["Confusion with Takeoff Pro"],
    roadmap: ["Merge or archive"],
    assignedGodBotId: "bot-god-takeoff",
    workerBotIds: ["bot-builder"],
    preferredInterface: "cursor",
    preferredModelClass: "cheap-fast",
    activeBotStrategy: "Usually skip — use Takeoff Pro God Bot",
    godBotFile: "projects/contractor-takeoff-staging.md",
  },
  {
    id: "proj-keps-trading",
    name: "Keps Trading",
    slug: "keps-trading",
    path: "",
    folderHints: ["keps trading", "keps-trading"],
    type: "Trading / Finance",
    stack: ["TBD"],
    status: "idea",
    priority: "P2",
    description: "Trading tooling — scope TBD, no repo yet.",
    goals: ["Define MVP", "Risk model", "Paper trading scope"],
    risks: ["Regulatory", "Bad automation cost"],
    roadmap: ["Spec phase", "Paper trading", "Alerting"],
    assignedGodBotId: "bot-god-keps",
    workerBotIds: ["bot-architect", "bot-data-model"],
    preferredInterface: "regular-claude",
    preferredModelClass: "planning-heavy",
    activeBotStrategy: "Spec + Architect first",
  },
  {
    id: "proj-points-miles",
    name: "Points & Miles Education",
    slug: "points-miles-edu",
    path: "",
    folderHints: ["points miles", "points-miles"],
    type: "Education / Content",
    stack: ["Next.js", "Content"],
    status: "prototype",
    priority: "P3",
    description: "Education platform for points and miles strategies.",
    goals: ["Curriculum outline", "Landing MVP"],
    risks: ["Scope creep"],
    roadmap: ["Spec", "Content model", "Beta landing"],
    assignedGodBotId: "bot-god-points",
    workerBotIds: ["bot-spec", "bot-ux", "bot-docs"],
    preferredInterface: "regular-claude",
    preferredModelClass: "planning-heavy",
    activeBotStrategy: "Spec Bot → UX → Builder",
  },
  {
    id: "proj-jeff-os",
    name: "Jeff OS",
    slug: "jeff-os",
    path: "C:\\Projects\\Project Command\\jeff-mission-control",
    altPaths: ["C:\\Projects\\Project Command\\jeff-mission-control\\docs\\command-center"],
    folderHints: ["jeff os", "jeff-os", "jeff-mission-control", "mission control", "command center"],
    type: "Meta / DevTools",
    stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind 4"],
    status: "active",
    priority: "P0",
    description: "Jeff OS — Easy Mode dashboard, verify build, gap/fix prompts, project docs.",
    goals: ["Dogfood self-build", "Honest verify + gaps", "Easy Mode polish"],
    risks: ["Self-verify while dev running", "Stale localStorage ops"],
    roadmap: ["Self listed in Projects", "Live gap truth", "Ship panel"],
    assignedGodBotId: "bot-god-jeff-os",
    workerBotIds: ["bot-builder", "bot-test", "bot-debug", "bot-docs"],
    preferredInterface: "cursor",
    preferredModelClass: "code-heavy",
    activeBotStrategy: "God Bot + Builder + Test — dogfood",
    godBotFile: "projects/jeff-os.md",
  },
];

export function normalizePath(p: string): string {
  return p.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

export function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
}

export function catalogById(id: string): CatalogEntry | undefined {
  return PROJECT_CATALOG.find((c) => c.id === id);
}

export function matchCatalogByPath(diskPath: string): CatalogEntry | undefined {
  const norm = normalizePath(diskPath);
  return PROJECT_CATALOG.find(
    (c) =>
      (c.path && normalizePath(c.path) === norm) ||
      c.altPaths?.some((a) => normalizePath(a) === norm),
  );
}

export function matchCatalogByFolderName(folderName: string): CatalogEntry | undefined {
  const norm = normalizeName(folderName);
  return PROJECT_CATALOG.find((c) =>
    c.folderHints.some((h) => normalizeName(h) === norm || norm.includes(normalizeName(h))),
  );
}
