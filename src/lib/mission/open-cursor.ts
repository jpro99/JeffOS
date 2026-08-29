import { isLocalHost } from "@/lib/deploy/online-access";

export type OpenCursorResult = {
  ok: boolean;
  message: string;
  promptFile?: string | null;
  via?: "localhost" | "bridge" | "queue";
};

type BridgeSettings = {
  bridgeUrl?: string | null;
  bridgeToken?: string | null;
};

async function postOpen(
  url: string,
  body: Record<string, unknown>,
  token?: string | null,
): Promise<OpenCursorResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Jeff-Bridge-Token": token } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    message?: string;
    promptFile?: string | null;
    id?: string;
  };
  if (!data.ok) {
    return { ok: false, message: data.error ?? "Could not open Cursor" };
  }
  return {
    ok: true,
    message: data.message ?? "Cursor opened",
    promptFile: data.promptFile,
  };
}

/**
 * Open Cursor with optional prompt file.
 * 1) Localhost Jeff OS API
 * 2) Direct PC Bridge URL (LAN / Tailscale) from Settings
 * 3) Lemon job queue — PC `npm run bridge` polls and opens Cursor
 */
export async function openCursorWithPrompt(
  folderPath: string,
  prompt?: string,
  settings?: BridgeSettings,
): Promise<OpenCursorResult> {
  const payload = {
    folderPath,
    prompt: prompt?.trim() || undefined,
    token: settings?.bridgeToken?.trim() || undefined,
  };

  const onLocal =
    typeof window !== "undefined" && isLocalHost(window.location.hostname);

  if (onLocal) {
    try {
      const local = await postOpen("/api/projects/open-in-cursor", payload);
      if (local.ok) return { ...local, via: "localhost" };
    } catch {
      /* fall through */
    }
  }

  const bridgeUrl = settings?.bridgeUrl?.trim().replace(/\/+$/, "");
  const token = settings?.bridgeToken?.trim();

  if (bridgeUrl && token) {
    try {
      const bridge = await postOpen(`${bridgeUrl}/open-cursor`, payload, token);
      if (bridge.ok) return { ...bridge, via: "bridge" };
      // continue to queue if bridge unreachable
    } catch {
      /* try queue */
    }
  }

  if (token && folderPath.trim()) {
    try {
      const queued = await postOpen("/api/bridge/enqueue", payload, token);
      if (queued.ok) {
        return {
          ok: true,
          via: "queue",
          message:
            queued.message ||
            "Sent to your PC bridge — keep `npm run bridge` running; Cursor should open in a few seconds",
        };
      }
      return queued;
    } catch {
      /* fall through */
    }
  }

  if (!onLocal) {
    return {
      ok: false,
      message:
        "Lemon can’t open Cursor alone. On your PC run: npm run bridge — then paste Bridge URL + token in Easy Settings.",
    };
  }

  return {
    ok: false,
    message: "Could not open Cursor — is the folder linked and Cursor CLI installed?",
  };
}
