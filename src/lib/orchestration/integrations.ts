import type { IntegrationSuggestion, Project } from "@/lib/types";
import { uid } from "@/lib/utils";

function buildScanText(project: Project): string {
  const orch = project.orchestration;
  return [
    project.name,
    project.description,
    ...project.goals,
    project.stack.join(" "),
    orch?.scope.pitch,
    orch?.scope.techPreferences,
    orch?.scope.targetUsers,
    orch?.scope.platforms?.join(" "),
    ...(orch?.features.map((f) => `${f.name} ${f.description}`) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function suggestIntegrations(project: Project): IntegrationSuggestion[] {
  const text = buildScanText(project);
  const platforms = project.orchestration?.scope.platforms ?? [];
  const hasWeb = platforms.includes("web") || platforms.includes("api") || /next|vercel|web/i.test(text);
  const hasMobile = platforms.includes("mobile") || /mobile|ios|android|capacitor|expo/i.test(text);
  const hasDesktop = platforms.includes("desktop") || /desktop|tauri|electron/i.test(text);
  const out: IntegrationSuggestion[] = [];

  const hasName = (name: string) => out.some((s) => s.name === name);

  const add = (s: Omit<IntegrationSuggestion, "id">) => {
    if (hasName(s.name)) return;
    out.push({ ...s, id: uid("int") });
  };

  if (/travel|flight|kepi|trip|duffel|hotel/i.test(text)) {
    add({
      name: "Flights API",
      purpose: "Search and book flights",
      providers: [
        { name: "Duffel", url: "https://app.duffel.com/", costRange: "$0–$200/mo + per booking", complexity: "medium" },
        { name: "Amadeus", url: "https://developers.amadeus.com/", costRange: "Pay per call", complexity: "high" },
      ],
      recommendedProvider: "Duffel",
      connectionStatus: "not-connected",
      notes: "Manual signup required. Jeff authorizes — no auto-account creation.",
      authorizeUrl: "https://app.duffel.com/",
      enables: "Flight search, booking, trip sync",
    });
  }

  if (/stripe|payment|saas|subscription|dunning|checkout|billing/i.test(text)) {
    add({
      name: "Payments",
      purpose: "Subscriptions and billing",
      providers: [
        { name: "Stripe", url: "https://dashboard.stripe.com/register", costRange: "2.9% + 30¢ per txn", complexity: "medium" },
      ],
      recommendedProvider: "Stripe",
      connectionStatus: "not-connected",
      notes: "Connect existing Stripe account. Webhooks need Security Bot review.",
      authorizeUrl: "https://dashboard.stripe.com/login",
      enables: "Checkout, subscriptions, Connect",
    });
  }

  if (/supabase|postgres|database|\bdb\b|storage|persist/i.test(text) || hasWeb) {
    add({
      name: "Database + Auth",
      purpose: "Data storage and user auth",
      providers: [
        { name: "Supabase", url: "https://supabase.com/dashboard", costRange: "$0–$25/mo free tier", complexity: "low" },
        { name: "Vercel Postgres", url: "https://vercel.com/storage", costRange: "$20+/mo", complexity: "low" },
      ],
      recommendedProvider: text.includes("supabase") ? "Supabase" : "Vercel Postgres",
      connectionStatus: "not-connected",
      notes: "Create project in dashboard. Copy env vars locally — never auto-provision.",
      enables: "Auth, RLS, realtime",
    });
  }

  if (/email|dunning|resend|sendgrid|notify|notification/i.test(text)) {
    add({
      name: "Transactional email",
      purpose: "User emails and dunning",
      providers: [
        { name: "Resend", url: "https://resend.com/signup", costRange: "$0–$20/mo", complexity: "low" },
        { name: "SendGrid", url: "https://signup.sendgrid.com/", costRange: "$0–$15/mo", complexity: "low" },
      ],
      recommendedProvider: "Resend",
      connectionStatus: "not-connected",
      notes: "Verify domain before prod sends.",
      enables: "Transactional + dunning emails",
    });
  }

  if (/ai|openai|gemini|anthropic|extract|legal|llm|chatbot|assistant/i.test(text)) {
    add({
      name: "AI / LLM",
      purpose: "Extraction, generation, assistants",
      providers: [
        { name: "OpenAI", url: "https://platform.openai.com/", costRange: "$20–$200/mo typical", complexity: "low" },
        { name: "Anthropic", url: "https://console.anthropic.com/", costRange: "$20–$150/mo", complexity: "low" },
        { name: "Google Gemini", url: "https://aistudio.google.com/", costRange: "$0–$50/mo", complexity: "low" },
      ],
      recommendedProvider: "OpenAI",
      connectionStatus: "not-connected",
      notes: "Use cost-save routing for simple prompts. Strong models for legal/extraction.",
      enables: "AI features in app",
    });
  }

  if (/map|geocode|gps|location|hotel|kepi search/i.test(text)) {
    add({
      name: "Maps",
      purpose: "Map tiles and geospatial",
      providers: [
        { name: "MapTiler", url: "https://cloud.maptiler.com/", costRange: "$0–$50/mo", complexity: "low" },
        { name: "MapLibre", url: "https://maplibre.org/", costRange: "Free (self-host tiles)", complexity: "medium" },
      ],
      recommendedProvider: "MapTiler",
      connectionStatus: "not-connected",
      notes: "MapTiler cloud or self-host MapLibre tiles.",
      enables: "Interactive maps",
    });
  }

  if (/clerk|auth|login|sign in|user account|oauth/i.test(text)) {
    add({
      name: "Auth provider",
      purpose: "User sign-in",
      providers: [{ name: "Clerk", url: "https://dashboard.clerk.com/", costRange: "$0–$25/mo", complexity: "low" }],
      recommendedProvider: "Clerk",
      connectionStatus: "not-connected",
      notes: "Manual Clerk app setup — copy keys to .env.",
      authorizeUrl: "https://dashboard.clerk.com/sign-in",
      enables: "OAuth, sessions, orgs",
    });
  }

  if (hasWeb || /vercel|deploy|next/i.test(text)) {
    add({
      name: "Hosting",
      purpose: "Deploy web app",
      providers: [{ name: "Vercel", url: "https://vercel.com/dashboard", costRange: "$0–$40/mo", complexity: "low" }],
      recommendedProvider: "Vercel",
      connectionStatus: "needs-setup",
      notes: "Link GitHub repo. Build before push on large apps.",
      enables: "Preview + production deploys",
    });
  }

  if (hasMobile) {
    add({
      name: "Mobile distribution",
      purpose: "Ship iOS + Android builds",
      providers: [
        { name: "Apple Developer", url: "https://developer.apple.com/account/", costRange: "$99/yr", complexity: "medium" },
        { name: "Google Play Console", url: "https://play.google.com/console/", costRange: "$25 one-time", complexity: "medium" },
      ],
      recommendedProvider: "Capacitor + store accounts",
      connectionStatus: "not-connected",
      notes: "Capacitor wraps your web app — store accounts are manual setup.",
      enables: "App Store + Play Store",
    });
  }

  if (hasDesktop) {
    add({
      name: "Desktop packaging",
      purpose: "Windows + Mac installers",
      providers: [{ name: "Tauri", url: "https://tauri.app/", costRange: "Free (self-sign certs optional)", complexity: "medium" }],
      recommendedProvider: "Tauri",
      connectionStatus: "not-connected",
      notes: "Same web UI as desktop app — code signing for prod releases.",
      enables: "Native desktop installers",
    });
  }

  if (platforms.includes("api") || /api|webhook|rest|graphql/i.test(text)) {
    add({
      name: "API layer",
      purpose: "Public or internal HTTP API",
      providers: [
        { name: "Next.js Route Handlers", url: "https://nextjs.org/docs/app/building-your-application/routing/route-handlers", costRange: "Included with Vercel", complexity: "low" },
      ],
      recommendedProvider: "Next.js Route Handlers",
      connectionStatus: "not-connected",
      notes: "Same repo as web — add auth middleware before exposing routes.",
      enables: "REST/JSON endpoints",
    });
  }

  // Greenfield fallback — never return empty after scan
  if (out.length === 0) {
    add({
      name: "Hosting",
      purpose: "Deploy web app",
      providers: [{ name: "Vercel", url: "https://vercel.com/dashboard", costRange: "$0–$40/mo", complexity: "low" }],
      recommendedProvider: "Vercel",
      connectionStatus: "needs-setup",
      notes: "Default starter — link GitHub when repo exists.",
      enables: "Preview + production deploys",
    });
    add({
      name: "Database + Auth",
      purpose: "Data storage when app grows",
      providers: [
        { name: "Supabase", url: "https://supabase.com/dashboard", costRange: "$0–$25/mo free tier", complexity: "low" },
      ],
      recommendedProvider: "Supabase",
      connectionStatus: "not-connected",
      notes: "Add when you need users or saved data.",
      enables: "Auth, Postgres, RLS",
    });
  }

  return out;
}

export function markIntegrationConnected(
  suggestions: IntegrationSuggestion[],
  id: string,
  status: IntegrationSuggestion["connectionStatus"],
): IntegrationSuggestion[] {
  return suggestions.map((s) => (s.id === id ? { ...s, connectionStatus: status } : s));
}

export function integrationScanSummary(project: Project): string {
  const n = suggestIntegrations(project).length;
  const platforms = project.orchestration?.scope.platforms?.join(", ") || "web";
  return `Scanned scope, goals, platforms (${platforms}) — ${n} API${n === 1 ? "" : "s"} recommended.`;
}
