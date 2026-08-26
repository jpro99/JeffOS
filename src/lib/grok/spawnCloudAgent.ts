export type CloudAgentSpawnResult = {
  ok: boolean;
  agentId?: string;
  agentUrl?: string;
  error?: string;
};

function cursorApiKey(env: NodeJS.Dict<string | undefined> = process.env): string | null {
  return env.CURSOR_API_KEY?.trim() || env.CURSOR_API_TOKEN?.trim() || null;
}

/** Start a Cursor Cloud Agent when CURSOR_API_KEY is configured — no paste-into-Cursor step. */
export async function spawnCloudAgent(opts: {
  prompt: string;
  botName: string;
  projectName: string | null;
  github: string | null;
  neverMerge?: boolean;
  neverGuess?: boolean;
}): Promise<CloudAgentSpawnResult> {
  const key = cursorApiKey();
  if (!key) {
    return { ok: false, error: "CURSOR_API_KEY not set" };
  }

  const rules = [
    opts.neverMerge !== false ? "Never merge to main. Open a draft PR only." : "",
    opts.neverGuess !== false ? "Never guess facts or dollars." : "",
    "Jeff approves every land.",
  ]
    .filter(Boolean)
    .join(" ");

  const text = [
    `Bot: ${opts.botName}`,
    opts.projectName ? `Project: ${opts.projectName}` : "",
    rules,
    "",
    opts.prompt.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const body: Record<string, unknown> = {
    prompt: { text },
    autoCreatePR: true,
  };

  if (opts.github?.trim()) {
    body.repos = [{ url: opts.github.trim(), startingRef: "main" }];
  }

  try {
    const res = await fetch("https://api.cursor.com/v1/agents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const data = (await res.json()) as {
      agent?: { id?: string; url?: string };
      id?: string;
      url?: string;
      error?: { message?: string };
      message?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message || data.message || `Cursor API ${res.status}`,
      };
    }

    const agentId = data.agent?.id || data.id;
    const agentUrl =
      data.agent?.url ||
      data.url ||
      (agentId ? `https://cursor.com/agents/${agentId}` : undefined);

    if (!agentId && !agentUrl) {
      return { ok: false, error: "Cursor API returned no agent id" };
    }

    return { ok: true, agentId, agentUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Cloud Agent spawn failed",
    };
  }
}

export function cloudAgentConfigured(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  return Boolean(cursorApiKey(env));
}
