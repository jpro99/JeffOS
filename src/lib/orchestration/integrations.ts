import type { IntegrationSuggestion, Project } from "@/lib/types";
import { uid } from "@/lib/utils";

export function suggestIntegrations(project: Project): IntegrationSuggestion[] {
  const text = `${project.name} ${project.description} ${project.stack.join(" ")} ${project.orchestration?.scope.pitch ?? ""}`.toLowerCase();
  const out: IntegrationSuggestion[] = [];

  const add = (s: Omit<IntegrationSuggestion, "id">) => {
    out.push({ ...s, id: uid("int") });
  };

  if (/travel|flight|kepi|trip|duffel/i.test(text)) {
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

  if (/stripe|payment|saas|subscription|dunning/i.test(text)) {
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

  if (/supabase|postgres|database|auth/i.test(text)) {
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

  if (/email|dunning|resend|sendgrid/i.test(text)) {
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

  if (/ai|openai|gemini|anthropic|extract|legal/i.test(text)) {
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

  if (/map|hotel|kepi search/i.test(text)) {
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

  if (/clerk|auth|login/i.test(text)) {
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

  if (/vercel|deploy|next/i.test(text)) {
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

  return out;
}

export function markIntegrationConnected(
  suggestions: IntegrationSuggestion[],
  id: string,
  status: IntegrationSuggestion["connectionStatus"],
): IntegrationSuggestion[] {
  return suggestions.map((s) => (s.id === id ? { ...s, connectionStatus: status } : s));
}
