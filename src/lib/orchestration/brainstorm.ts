import type { BrainstormCandidate, Project, ProjectOrchestration } from "@/lib/types";
import { uid } from "@/lib/utils";

const TEMPLATES: {
  match: (p: Project) => boolean;
  candidates: Omit<BrainstormCandidate, "id">[];
}[] = [
  {
    match: (p) => /travel|kepi|trip|map/i.test(p.name + p.description),
    candidates: [
      {
        name: "Trip timeline view",
        description: "Single timeline for flights, hotels, activities.",
        type: "core",
        priority: "P1",
        rationale: "Core travel OS value — everything in one place.",
      },
      {
        name: "Duffel flight search",
        description: "Search and book flights via Duffel API.",
        type: "core",
        priority: "P1",
        rationale: "Travel app needs flight data — Duffel is standard.",
      },
      {
        name: "Offline trip cache",
        description: "Cache trip data for spotty connectivity.",
        type: "nice-to-have",
        priority: "P2",
        rationale: "Mobile travel needs offline resilience.",
      },
      {
        name: "Disruption alerts",
        description: "Notify when flights change — suggest rebooking.",
        type: "experimental",
        priority: "P3",
        rationale: "World-class twist — proactive assistant.",
      },
    ],
  },
  {
    match: (p) => /legal|demand|bankruptcy|chapter/i.test(p.name + p.description),
    candidates: [
      {
        name: "Document upload + AI extract",
        description: "Upload PDFs, extract fields automatically.",
        type: "core",
        priority: "P0",
        rationale: "Legal workflows start with documents.",
      },
      {
        name: "Matter dashboard",
        description: "Single view of case status, docs, next steps.",
        type: "core",
        priority: "P1",
        rationale: "Attorneys need one screen per matter.",
      },
      {
        name: "Security audit pass",
        description: "RLS, auth, upload path hardening.",
        type: "core",
        priority: "P0",
        rationale: "Legal data — security is feature zero.",
      },
    ],
  },
  {
    match: (p) => /saas|stripe|dunning|subscription/i.test(p.name + p.description),
    candidates: [
      {
        name: "Stripe webhook handler",
        description: "Reliable webhook ingestion + idempotency.",
        type: "core",
        priority: "P0",
        rationale: "Payment SaaS lives or dies on webhooks.",
      },
      {
        name: "Dunning email sequences",
        description: "Configurable recovery email flows.",
        type: "core",
        priority: "P1",
        rationale: "Core product value.",
      },
      {
        name: "Admin analytics",
        description: "Recovery rate, MRR saved dashboard.",
        type: "nice-to-have",
        priority: "P2",
        rationale: "Proves ROI to customers.",
      },
    ],
  },
  {
    match: () => true,
    candidates: [
      {
        name: "User auth + onboarding",
        description: "Sign up, login, first-run experience.",
        type: "core",
        priority: "P1",
        rationale: "Most apps need identity first.",
      },
      {
        name: "Core data model",
        description: "Entities, relations, migrations.",
        type: "core",
        priority: "P1",
        rationale: "Foundation before features stack.",
      },
      {
        name: "Settings + profile",
        description: "User preferences and account settings.",
        type: "nice-to-have",
        priority: "P2",
        rationale: "Expected in any mature app.",
      },
      {
        name: "Error monitoring",
        description: "Sentry or similar — catch prod errors.",
        type: "nice-to-have",
        priority: "P2",
        rationale: "Ship safe — know when things break.",
      },
      {
        name: "API docs",
        description: "Internal or public API documentation.",
        type: "nice-to-have",
        priority: "P3",
        rationale: "Docs Bot handles this late in pipeline.",
      },
    ],
  },
];

export function brainstormFeatures(project: Project): BrainstormCandidate[] {
  const orch = project.orchestration!;
  const existing = new Set(orch.features.map((f) => f.name.toLowerCase()));
  const seen = new Set<string>();
  const out: BrainstormCandidate[] = [];

  for (const tpl of TEMPLATES) {
    if (!tpl.match(project)) continue;
    for (const c of tpl.candidates) {
      const key = c.name.toLowerCase();
      if (existing.has(key) || seen.has(key)) continue;
      seen.add(key);
      out.push({ ...c, id: uid("cand") });
    }
  }

  if (orch.scope.pitch) {
    const words = orch.scope.pitch.split(/\s+/).slice(0, 6).join(" ");
    if (words.length > 10 && !existing.has(words.toLowerCase())) {
      out.unshift({
        id: uid("cand"),
        name: `MVP: ${words.slice(0, 40)}`,
        description: `Ship smallest version of: ${orch.scope.pitch}`,
        type: "core",
        priority: "P1",
        rationale: "Derived from your pitch — start here.",
      });
    }
  }

  return out.slice(0, 12);
}
