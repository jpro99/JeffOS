/** Where Jeff OS is reachable online (Vercel, custom domain, etc.) */
export function normalizePublicUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t.replace(/\/+$/, "");
  return `https://${t.replace(/\/+$/, "")}`;
}

export function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.endsWith(".local")
  );
}

export function clientPublicOrigin(): string | null {
  if (typeof window === "undefined") return null;
  if (isLocalHost(window.location.hostname)) return null;
  return window.location.origin;
}

export function resolveDisplayUrl(
  savedUrl: string | null | undefined,
  liveOrigin: string | null,
): string | null {
  return liveOrigin ?? (savedUrl ? normalizePublicUrl(savedUrl) : null);
}

export function easyModeUrl(base: string): string {
  return `${base.replace(/\/+$/, "")}/easy`;
}
