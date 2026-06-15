import type { ConnectionInventoryItem } from "@/lib/connections/inventory";
import type { IntegrationConnectionStatus, Project } from "@/lib/types";

const BASE_WITHOUT_APIS = 78;
const MAX_SCORE = 100;

export interface ApiRunScoreResult {
  score: number;
  baseScore: number;
  maxWithApis: number;
  connected: number;
  needsSetup: number;
  notConnected: number;
  total: number;
  headline: string;
  detail: string;
  lines: string[];
  ready: boolean;
  needsScan: boolean;
}

const API_KINDS = new Set([
  "duffel",
  "maptiler",
  "stripe",
  "clerk",
  "vercel",
  "supabase",
  "postgres",
  "openai",
  "anthropic",
  "gemini",
  "resend",
  "sentry",
  "inngest",
  "upstash",
]);

function scoreFromStatuses(
  items: { name: string; status: IntegrationConnectionStatus }[],
): Omit<ApiRunScoreResult, "needsScan"> {
  const total = items.length;
  const connected = items.filter((i) => i.status === "connected").length;
  const needsSetup = items.filter((i) => i.status === "needs-setup").length;
  const notConnected = items.filter((i) => i.status === "not-connected").length;

  if (total === 0) {
    return {
      score: 0,
      baseScore: BASE_WITHOUT_APIS,
      maxWithApis: MAX_SCORE,
      connected: 0,
      needsSetup: 0,
      notConnected: 0,
      total: 0,
      headline: "Scan for APIs first",
      detail: "Run Scan for APIs — then Try and Run It for your score.",
      lines: [],
      ready: false,
    };
  }

  if (connected === total) {
    return {
      score: MAX_SCORE,
      baseScore: BASE_WITHOUT_APIS,
      maxWithApis: MAX_SCORE,
      connected,
      needsSetup,
      notConnected,
      total,
      headline: "100 — all APIs ready",
      detail: "Every recommended API is connected. You're at full ship score.",
      lines: items.map((i) => `✓ ${i.name}`),
      ready: true,
    };
  }

  const partialCredit = connected + needsSetup * 0.35;
  const apiRatio = partialCredit / total;
  const score = Math.min(
    MAX_SCORE - 1,
    Math.round(BASE_WITHOUT_APIS + apiRatio * (MAX_SCORE - BASE_WITHOUT_APIS)),
  );

  const missing = items.filter((i) => i.status === "not-connected").map((i) => i.name);

  return {
    score,
    baseScore: BASE_WITHOUT_APIS,
    maxWithApis: MAX_SCORE,
    connected,
    needsSetup,
    notConnected,
    total,
    headline: `${score}/100 — APIs not fully wired`,
    detail: `Without all APIs you're around ${BASE_WITHOUT_APIS}–80. Connect ${missing.length} more to hit 100.`,
    lines: [
      `Base (app + scope, no APIs): ~${BASE_WITHOUT_APIS}/100`,
      `APIs connected: ${connected}/${total}${needsSetup ? ` (+${needsSetup} in progress)` : ""}`,
      ...missing.slice(0, 5).map((n) => `○ Still need: ${n}`),
    ],
    ready: score >= 95,
  };
}

function itemsFromInventory(inventory: ConnectionInventoryItem[]) {
  return inventory
    .filter(
      (i) =>
        i.source === "integration" ||
        API_KINDS.has(String(i.kind)) ||
        (i.source === "catalog" && i.kind !== "github" && i.kind !== "local"),
    )
    .map((i) => ({ name: i.name, status: i.status }));
}

function itemsFromSuggestions(project: Project) {
  return (project.orchestration?.integrationSuggestions ?? []).map((s) => ({
    name: s.name,
    status: s.connectionStatus,
  }));
}

/** Free local score — no paid API calls. Uses scan + your marks. */
export function computeApiRunScore(
  project: Project,
  inventory?: ConnectionInventoryItem[],
): ApiRunScoreResult {
  const fromInventory = inventory ? itemsFromInventory(inventory) : [];
  const fromSuggestions = itemsFromSuggestions(project);

  const items =
    fromInventory.length >= fromSuggestions.length && fromInventory.length > 0
      ? fromInventory
      : fromSuggestions;

  if (items.length === 0) {
    return {
      score: 0,
      baseScore: BASE_WITHOUT_APIS,
      maxWithApis: MAX_SCORE,
      connected: 0,
      needsSetup: 0,
      notConnected: 0,
      total: 0,
      headline: "Scan for APIs first",
      detail: "Tap Scan for APIs, then Try and Run It — free, no API charges.",
      lines: [
        `Without APIs: ~${BASE_WITHOUT_APIS}/100`,
        `With all APIs connected: ${MAX_SCORE}/100`,
      ],
      ready: false,
      needsScan: true,
    };
  }

  return { ...scoreFromStatuses(items), needsScan: false };
}

export function scoreColor(score: number): string {
  if (score >= 100) return "text-emerald-300";
  if (score >= 85) return "text-teal-300";
  if (score >= BASE_WITHOUT_APIS) return "text-amber-200";
  return "text-rose-300";
}

export function scoreRingClass(score: number): string {
  if (score >= 100) return "border-emerald-500/40 bg-emerald-500/10";
  if (score >= 85) return "border-teal-500/40 bg-teal-500/10";
  if (score >= BASE_WITHOUT_APIS) return "border-amber-500/35 bg-amber-500/10";
  return "border-rose-500/35 bg-rose-500/10";
}
