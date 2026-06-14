"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { JEFF_OS_GITHUB } from "@/components/easy/EasySelfBuildBanner";
import {
  clientPublicOrigin,
  easyModeUrl,
  normalizePublicUrl,
  resolveDisplayUrl,
} from "@/lib/deploy/online-access";
import { useMissionControl } from "@/lib/store/context";
import { cn, copyToClipboard } from "@/lib/utils";

function ConnDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ring-1",
        ok
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25"
          : "bg-zinc-500/10 text-zinc-500 ring-white/10",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-zinc-600")} />
      {label}
    </span>
  );
}

export function EasyOnlineAccess({ compact = false }: { compact?: boolean }) {
  const { state, updateSettings } = useMissionControl();
  const [liveOrigin, setLiveOrigin] = useState<string | null>(null);
  const [vercelDeployed, setVercelDeployed] = useState(false);
  const [urlDraft, setUrlDraft] = useState(state.settings.productionUrl ?? "");
  const [msg, setMsg] = useState<string | null>(null);

  const savedUrl = state.settings.productionUrl;
  const displayUrl = useMemo(
    () => resolveDisplayUrl(savedUrl, liveOrigin),
    [savedUrl, liveOrigin],
  );
  const easyUrl = displayUrl ? easyModeUrl(displayUrl) : null;

  useEffect(() => {
    setLiveOrigin(clientPublicOrigin());
  }, []);

  useEffect(() => {
    void fetch("/api/online-status")
      .then((r) => r.json())
      .then((d: { productionUrl?: string; isVercel?: boolean }) => {
        if (d.productionUrl && !liveOrigin) setLiveOrigin(d.productionUrl);
        if (d.isVercel) setVercelDeployed(true);
      })
      .catch(() => {});
  }, [liveOrigin]);

  const saveUrl = useCallback(() => {
    const next = normalizePublicUrl(urlDraft);
    updateSettings({ productionUrl: next });
    setMsg(next ? "Saved production URL" : "Cleared URL");
  }, [urlDraft, updateSettings]);

  const copyLink = async () => {
    if (!easyUrl) return;
    const ok = await copyToClipboard(easyUrl);
    setMsg(ok ? "Copied — open on phone" : "Copy failed");
  };

  const isOnline = Boolean(liveOrigin);

  if (compact && isOnline) {
    return (
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p className="text-[10px] text-emerald-400">● Online — phone + anywhere</p>
        {easyUrl && (
          <button
            type="button"
            onClick={() => void copyLink()}
            className="text-[10px] text-teal-400 hover:underline"
          >
            Copy {easyUrl.replace("https://", "")}
          </button>
        )}
      </div>
    );
  }

  return (
    <section
      id="go-live"
      className={cn(
        "rounded-2xl border p-5 shadow-lg shadow-black/20",
        isOnline
          ? "border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.08] to-transparent"
          : "border-teal-500/20 bg-gradient-to-b from-teal-500/[0.06] to-transparent",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/90">
        {isOnline ? "Live online" : "Go live — connected for sale"}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-50">
        {isOnline ? "See Jeff OS from phone or anywhere" : "Put Jeff OS on the internet"}
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        {isOnline
          ? "This session is on the public web. Bookmark or Add to Home Screen on your phone."
          : "Push to GitHub → deploy on Vercel → open your URL on any device."}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <ConnDot ok label="GitHub JeffOS" />
        <ConnDot ok={vercelDeployed || Boolean(savedUrl)} label="Vercel deploy" />
        <ConnDot ok={isOnline || Boolean(savedUrl)} label="Public URL" />
      </div>

      {isOnline && easyUrl ? (
        <div className="mt-4 space-y-3 rounded-xl border border-emerald-500/20 bg-black/30 p-4">
          <p className="font-mono text-xs text-emerald-200">{easyUrl}</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={easyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
            >
              Open Easy Mode ↗
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300"
            >
              Copy link for phone
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">
            iPhone: Share → Add to Home Screen. Android: menu → Install app.
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-2 text-sm text-zinc-400">
          <li>
            1. GitHub pushed —{" "}
            <a href={JEFF_OS_GITHUB} target="_blank" rel="noreferrer" className="text-teal-500 hover:underline">
              github.com/jpro99/JeffOS
            </a>
          </li>
          <li>2. Vercel → Import JeffOS → Root Directory <strong className="text-zinc-300">.</strong></li>
          <li>3. Deploy → copy your <strong className="text-zinc-300">.vercel.app</strong> URL below</li>
          <li>4. Open <strong className="text-zinc-300">/easy</strong> on phone — same Jeff OS</li>
        </ol>
      )}

      {!isOnline && (
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="your-app.vercel.app"
            className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-zinc-300"
          />
          <button
            type="button"
            onClick={saveUrl}
            className="rounded-full bg-teal-500 px-4 py-2 text-xs font-semibold text-black hover:bg-teal-400"
          >
            Save URL
          </button>
          {displayUrl && !liveOrigin && (
            <a
              href={easyModeUrl(displayUrl)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-teal-400"
            >
              Open saved URL ↗
            </a>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/easy/projects/proj-jeff-os#ship-panel"
          className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-200"
        >
          Ship panel →
        </Link>
      </div>

      <p className="mt-3 text-[10px] text-zinc-600">
        Data stays in your browser (localStorage). No cloud login yet — fine for Jeff, add auth before public sale.
      </p>

      {msg && <p className="mt-2 text-xs text-teal-400">{msg}</p>}
    </section>
  );
}
