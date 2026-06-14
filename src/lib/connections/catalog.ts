import type { ProjectConnection } from "@/lib/types";

type ConnInput = Omit<ProjectConnection, "billingSource"> & { billingSource?: ProjectConnection["billingSource"] };

function c(input: ConnInput): ProjectConnection {
  return { billingSource: "estimated", ...input };
}

/** Default connections + cost estimates per project — edit in Settings or project panel */
export const PROJECT_CONNECTIONS: Record<string, ProjectConnection[]> = {
  "proj-bankruptcy": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/ChapterAI", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", dashboardUrl: "https://vercel.com/dashboard", estimatedMonthlyUsd: 45 }),
    c({ id: "pg", kind: "postgres", name: "Postgres", url: "https://vercel.com/storage", estimatedMonthlyUsd: 25 }),
    c({ id: "openai", kind: "openai", name: "OpenAI", url: "https://platform.openai.com/usage", dashboardUrl: "https://platform.openai.com/settings/organization/billing", estimatedMonthlyUsd: 35 }),
    c({ id: "local", kind: "local", name: "Local dev", url: "http://localhost:3000", description: "Web :3000 · API :3002", estimatedMonthlyUsd: 0 }),
  ],
  "proj-takeoff-pro": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/contractor-takeoff-estimator", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 20 }),
    c({ id: "supa", kind: "supabase", name: "Supabase", url: "https://supabase.com/dashboard", dashboardUrl: "https://supabase.com/dashboard/project/_/settings/billing", estimatedMonthlyUsd: 25 }),
    c({ id: "local", kind: "local", name: "Local dev", url: "http://localhost:3000", estimatedMonthlyUsd: 0 }),
  ],
  "proj-demand-generator": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/Demand-Generator-Pro", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 35 }),
    c({ id: "pg", kind: "postgres", name: "Vercel Postgres", url: "https://vercel.com/storage", estimatedMonthlyUsd: 20 }),
    c({ id: "blob", kind: "vercel", name: "Vercel Blob", url: "https://vercel.com/dashboard/stores", estimatedMonthlyUsd: 8 }),
    c({ id: "gemini", kind: "gemini", name: "Google Gemini", url: "https://aistudio.google.com/", estimatedMonthlyUsd: 15 }),
    c({ id: "openai", kind: "openai", name: "OpenAI", url: "https://platform.openai.com/usage", estimatedMonthlyUsd: 12 }),
    c({ id: "local", kind: "local", name: "Local dev", url: "http://localhost:3001", description: "Port 3001 per AGENTS.md", estimatedMonthlyUsd: 0 }),
  ],
  "proj-dunningguard": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/DunningGuard", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 20 }),
    c({ id: "supa", kind: "supabase", name: "Supabase", url: "https://supabase.com/dashboard", estimatedMonthlyUsd: 25 }),
    c({ id: "stripe", kind: "stripe", name: "Stripe", url: "https://dashboard.stripe.com/dashboard", dashboardUrl: "https://dashboard.stripe.com/settings/billing", estimatedMonthlyUsd: 0 }),
    c({ id: "resend", kind: "resend", name: "Resend", url: "https://resend.com/overview", estimatedMonthlyUsd: 10 }),
  ],
  "proj-tripflow": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/Kepi-Travel", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 40 }),
    c({ id: "clerk", kind: "clerk", name: "Clerk", url: "https://dashboard.clerk.com/", estimatedMonthlyUsd: 25 }),
    c({ id: "upstash", kind: "upstash", name: "Upstash Redis", url: "https://console.upstash.com/", estimatedMonthlyUsd: 10 }),
    c({ id: "stripe", kind: "stripe", name: "Stripe", url: "https://dashboard.stripe.com/dashboard", estimatedMonthlyUsd: 0 }),
    c({ id: "duffel", kind: "duffel", name: "Duffel", url: "https://app.duffel.com/", dashboardUrl: "https://app.duffel.com/billing", estimatedMonthlyUsd: 0 }),
    c({ id: "anthropic", kind: "anthropic", name: "Anthropic", url: "https://console.anthropic.com/settings/billing", estimatedMonthlyUsd: 20 }),
    c({ id: "inngest", kind: "inngest", name: "Inngest", url: "https://app.inngest.com/", estimatedMonthlyUsd: 0 }),
    c({ id: "sentry", kind: "sentry", name: "Sentry", url: "https://sentry.io/settings/billing/", estimatedMonthlyUsd: 0 }),
    c({ id: "maptiler", kind: "maptiler", name: "MapTiler", url: "https://cloud.maptiler.com/account/billing", estimatedMonthlyUsd: 15 }),
  ],
  "proj-kepi-search": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/kepi-search", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 15 }),
    c({ id: "maptiler", kind: "maptiler", name: "MapTiler", url: "https://cloud.maptiler.com/account/billing", estimatedMonthlyUsd: 10 }),
  ],
  "proj-edgar": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/All-In-One-Edgar", estimatedMonthlyUsd: 0 }),
    c({ id: "nas", kind: "nas", name: "NAS Docker", url: "http://localhost", description: "Ugreen NAS deploy — local network", estimatedMonthlyUsd: 5 }),
    c({ id: "azure", kind: "other", name: "Microsoft Entra", url: "https://entra.microsoft.com/", estimatedMonthlyUsd: 0 }),
  ],
  "proj-home-compass": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/household-compass", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 15 }),
    c({ id: "supa", kind: "supabase", name: "Supabase", url: "https://supabase.com/dashboard", estimatedMonthlyUsd: 25 }),
  ],
  "proj-general-dev": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/language-translator", estimatedMonthlyUsd: 0 }),
    c({ id: "local", kind: "local", name: "Local PWA", url: "http://localhost:5173", estimatedMonthlyUsd: 0 }),
  ],
  "proj-story-pals": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/Story-Pals", estimatedMonthlyUsd: 0 }),
  ],
  "proj-takeoff-staging": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/contractor-takeoff-staging", estimatedMonthlyUsd: 0 }),
    c({ id: "vercel", kind: "vercel", name: "Vercel", url: "https://vercel.com/dashboard", estimatedMonthlyUsd: 0 }),
  ],
  "proj-keps-trading": [],
  "proj-points-miles": [],
  "proj-jeff-os": [
    c({ id: "gh", kind: "github", name: "GitHub", url: "https://github.com/jpro99/JeffOS", estimatedMonthlyUsd: 0 }),
    c({
      id: "vercel",
      kind: "vercel",
      name: "Vercel",
      url: "https://vercel.com/new",
      dashboardUrl: "https://vercel.com/dashboard",
      description: "Import github.com/jpro99/JeffOS — Root Directory = .",
      estimatedMonthlyUsd: 0,
    }),
    c({
      id: "local",
      kind: "local",
      name: "Local dev",
      url: "http://localhost:3000",
      description: "npm run dev",
      estimatedMonthlyUsd: 0,
    }),
  ],
  "proj-new-idea": [],
};

export const CONNECTION_ICONS: Record<string, string> = {
  github: "⎇",
  vercel: "▲",
  supabase: "◆",
  stripe: "💳",
  clerk: "🔐",
  openai: "◎",
  gemini: "✦",
  anthropic: "◈",
  duffel: "✈",
  maptiler: "🗺",
  upstash: "⚡",
  resend: "✉",
  sentry: "🛡",
  inngest: "⚙",
  postgres: "🐘",
  nas: "💾",
  local: "⌂",
  other: "◇",
};

export function getConnectionsForProject(projectId: string): ProjectConnection[] {
  return PROJECT_CONNECTIONS[projectId] ?? [];
}
