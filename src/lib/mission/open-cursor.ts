/** Client helper — open Cursor on project folder; optionally drop prompt file. Localhost only. */
export async function openCursorWithPrompt(
  folderPath: string,
  prompt?: string,
): Promise<{ ok: boolean; message: string; promptFile?: string | null }> {
  try {
    const res = await fetch("/api/projects/open-in-cursor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderPath, prompt: prompt?.trim() || undefined }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      message?: string;
      promptFile?: string | null;
    };
    if (!data.ok) {
      return { ok: false, message: data.error ?? "Could not open Cursor" };
    }
    return {
      ok: true,
      message: data.message ?? "Cursor opened",
      promptFile: data.promptFile,
    };
  } catch {
    return {
      ok: false,
      message: "Open Cursor needs localhost (npm run go) — Lemon cannot launch apps on your PC",
    };
  }
}
