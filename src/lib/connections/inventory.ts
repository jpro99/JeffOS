import type {
  ConnectionKind,
  IntegrationConnectionStatus,
  Project,
  ProjectConnection,
} from "@/lib/types";
import type { FolderScan } from "@/lib/project-scan/analyze";
import { CONNECTION_ICONS } from "@/lib/connections/catalog";

export type ConnectionCategory =
  | "flights"
  | "maps"
  | "payments"
  | "auth"
  | "hosting"
  | "database"
  | "ai"
  | "email"
  | "monitoring"
  | "infra"
  | "other";

export type ConnectionVerifyMethod =
  | "manual"
  | "local-env"
  | "code-wired"
  | "vercel-cloud"
  | "catalog-only";

export interface ConnectionInventoryItem {
  id: string;
  name: string;
  category: ConnectionCategory;
  kind: ConnectionKind | string;
  icon: string;
  status: IntegrationConnectionStatus;
  statusLabel: string;
  detail: string;
  dashboardUrl?: string;
  envKeys: string[];
  monthlyUsd?: number;
  source: "catalog" | "integration" | "infra";
  connectionId?: string;
  integrationId?: string;
  verifyMethod: ConnectionVerifyMethod;
}

const KIND_TO_CATEGORY: Record<string, ConnectionCategory> = {
  duffel: "flights",
  maptiler: "maps",
  stripe: "payments",
  clerk: "auth",
  vercel: "hosting",
  supabase: "database",
  postgres: "database",
  openai: "ai",
  anthropic: "ai",
  gemini: "ai",
  resend: "email",
  sentry: "monitoring",
  inngest: "other",
  upstash: "other",
  github: "infra",
  local: "infra",
  nas: "infra",
};

const INTEGRATION_NAME_TO_KIND: Record<string, string> = {
  "flights api": "duffel",
  maps: "maptiler",
  payments: "stripe",
  "auth provider": "clerk",
  hosting: "vercel",
  "database + auth": "supabase",
  "transactional email": "resend",
  "ai / llm": "openai",
};

function categoryForKind(kind: string): ConnectionCategory {
  return KIND_TO_CATEGORY[kind] ?? "other";
}

function envKeysForKind(kind: string, allKeys: string[]): string[] {
  const patterns: Record<string, RegExp> = {
    duffel: /DUFFEL/i,
    maptiler: /MAPTILER/i,
    stripe: /STRIPE/i,
    clerk: /CLERK/i,
    supabase: /SUPABASE/i,
    openai: /OPENAI/i,
    anthropic: /ANTHROPIC/i,
    gemini: /GEMINI/i,
    resend: /RESEND/i,
    upstash: /UPSTASH/i,
    sentry: /SENTRY/i,
    inngest: /INNGEST/i,
  };
  const p = patterns[kind];
  if (!p) return [];
  return allKeys.filter((k) => p.test(k));
}

function resolveStatus(
  conn: ProjectConnection | undefined,
  integrationStatus: IntegrationConnectionStatus | undefined,
  scan: FolderScan,
  kind: string,
): { status: IntegrationConnectionStatus; label: string; verifyMethod: ConnectionVerifyMethod } {
  if (conn?.setupStatus === "connected" || integrationStatus === "connected") {
    return { status: "connected", label: "Connected — you confirmed", verifyMethod: "manual" };
  }

  if (scan.envConfiguredServices.includes(kind)) {
    return {
      status: "connected",
      label: "Local .env has keys (not API-tested)",
      verifyMethod: "local-env",
    };
  }

  if (scan.codeIntegrations.includes(kind)) {
    if (scan.vercelLinked && kind !== "vercel") {
      return {
        status: "connected",
        label: "Wired in code — keys likely on Vercel (free scan)",
        verifyMethod: "vercel-cloud",
      };
    }
    return {
      status: "needs-setup",
      label: "Package installed — add env keys if not on Vercel",
      verifyMethod: "code-wired",
    };
  }

  if (kind === "vercel" && scan.vercelLinked) {
    return {
      status: "connected",
      label: "Vercel project linked on disk",
      verifyMethod: "vercel-cloud",
    };
  }

  if (conn?.setupStatus === "needs-setup" || integrationStatus === "needs-setup") {
    return {
      status: "needs-setup",
      label: "Marked needs setup",
      verifyMethod: "catalog-only",
    };
  }

  const envKeys = envKeysForKind(kind, scan.envKeys);
  if (scan.envServices.includes(kind) || envKeys.length > 0) {
    return {
      status: "needs-setup",
      label: ".env.example lists keys — fill .env or Vercel dashboard",
      verifyMethod: "catalog-only",
    };
  }

  return {
    status: "not-connected",
    label: "Not detected — catalog link only",
    verifyMethod: "catalog-only",
  };
}

function statusSort(a: IntegrationConnectionStatus): number {
  if (a === "connected") return 0;
  if (a === "needs-setup") return 1;
  return 2;
}

export function buildConnectionInventory(
  project: Project,
  scan: FolderScan,
): ConnectionInventoryItem[] {
  const items = new Map<string, ConnectionInventoryItem>();

  const add = (item: ConnectionInventoryItem) => {
    const key = item.kind;
    const existing = items.get(key);
    if (!existing || statusSort(item.status) < statusSort(existing.status)) {
      items.set(key, item);
    }
  };

  if (project.path && scan.exists) {
    add({
      id: "infra-local",
      name: "Local project folder",
      category: "infra",
      kind: "local",
      icon: "📁",
      status: "connected",
      statusLabel: "Folder on disk",
      detail: project.path,
      envKeys: [],
      source: "infra",
      verifyMethod: "manual",
    });
  }

  if (project.github) {
    add({
      id: "infra-github",
      name: "GitHub",
      category: "infra",
      kind: "github",
      icon: CONNECTION_ICONS.github,
      status: "connected",
      statusLabel: "Repo linked",
      detail: project.github,
      dashboardUrl: project.github,
      envKeys: [],
      source: "infra",
      verifyMethod: "manual",
    });
  }

  for (const conn of project.connections ?? []) {
    const envKeys = envKeysForKind(conn.kind, [...scan.envKeys, ...scan.envConfiguredKeyNames]);
    const { status, label, verifyMethod } = resolveStatus(conn, undefined, scan, conn.kind);

    add({
      id: conn.id,
      name: conn.name,
      category: categoryForKind(conn.kind),
      kind: conn.kind,
      icon: CONNECTION_ICONS[conn.kind] ?? "◇",
      status,
      statusLabel: label,
      detail: conn.description ?? `Dashboard link in catalog`,
      dashboardUrl: conn.dashboardUrl ?? conn.url,
      envKeys,
      monthlyUsd: conn.estimatedMonthlyUsd,
      source: "catalog",
      connectionId: conn.id,
      verifyMethod,
    });
  }

  for (const int of project.orchestration?.integrationSuggestions ?? []) {
    const kind =
      INTEGRATION_NAME_TO_KIND[int.name.toLowerCase()] ??
      int.recommendedProvider?.toLowerCase() ??
      int.id;
    const envKeys = envKeysForKind(kind, [...scan.envKeys, ...scan.envConfiguredKeyNames]);
    const existingConn = project.connections?.find((c) => c.kind === kind);
    const { status, label, verifyMethod } = resolveStatus(
      existingConn,
      int.connectionStatus,
      scan,
      kind,
    );

    if (items.has(kind)) {
      const prev = items.get(kind)!;
      const useNew = statusSort(status) < statusSort(prev.status);
      items.set(kind, {
        ...prev,
        status: useNew ? status : prev.status,
        statusLabel: useNew ? label : prev.statusLabel,
        verifyMethod: useNew ? verifyMethod : prev.verifyMethod,
        integrationId: int.id,
        detail: int.enables ?? prev.detail,
        envKeys: envKeys.length ? envKeys : prev.envKeys,
      });
      continue;
    }

    add({
      id: int.id,
      name: int.recommendedProvider ? `${int.name} (${int.recommendedProvider})` : int.name,
      category: categoryForKind(kind),
      kind,
      icon: CONNECTION_ICONS[kind] ?? "◇",
      status,
      statusLabel: label,
      detail: int.enables ?? int.purpose,
      dashboardUrl: int.authorizeUrl ?? int.providers[0]?.url,
      envKeys,
      source: "integration",
      integrationId: int.id,
      verifyMethod,
    });
  }

  return [...items.values()].sort((a, b) => {
    const cat = a.category.localeCompare(b.category);
    if (cat !== 0) return cat;
    return statusSort(a.status) - statusSort(b.status);
  });
}

export function inventorySummary(inventory: ConnectionInventoryItem[]) {
  const connected = inventory.filter((i) => i.status === "connected").length;
  const needsSetup = inventory.filter((i) => i.status === "needs-setup").length;
  const notConnected = inventory.filter((i) => i.status === "not-connected").length;
  return { connected, needsSetup, notConnected, total: inventory.length };
}

export const CATEGORY_LABELS: Record<ConnectionCategory, string> = {
  flights: "Flights",
  maps: "Maps",
  payments: "Payments",
  auth: "Auth",
  hosting: "Hosting",
  database: "Database",
  ai: "AI",
  email: "Email",
  monitoring: "Monitoring",
  infra: "Infrastructure",
  other: "Other",
};
