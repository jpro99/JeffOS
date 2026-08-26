import { NextResponse } from "next/server";
import { probeOllama, resolveLocalEngine, resolvePaidEngine } from "@/lib/grok/engine";
import { cloudAgentConfigured } from "@/lib/grok/spawnCloudAgent";
import { CLOUD_AGENTS_HOME, LOCAL_MODEL_PICKS } from "@/lib/grok/localModels";

export const runtime = "nodejs";

export async function GET() {
  const paid = resolvePaidEngine();
  const localCfg = resolveLocalEngine();
  const probe = localCfg ? await probeOllama() : { ok: false, models: [] as string[] };
  return NextResponse.json({
    ready: Boolean(paid || probe.ok),
    local: localCfg
      ? {
          configured: true,
          ready: probe.ok,
          model: localCfg.model,
          label: localCfg.label,
          models: probe.models,
        }
      : { configured: false, ready: false, model: null, label: null, models: [] },
    paid: paid ? { label: paid.label, model: paid.model } : null,
    cloudAgents: { home: CLOUD_AGENTS_HOME, autoStart: cloudAgentConfigured() },
    catalog: LOCAL_MODEL_PICKS,
    engine: paid ? { label: paid.label, model: paid.model } : probe.ok && localCfg
      ? { label: localCfg.label, model: localCfg.model }
      : null,
  });
}
