import { NextResponse } from "next/server";

/** POST — trigger Vercel redeploy via Deploy Hook (optional env var) */
export async function POST() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  if (!hook) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No deploy hook configured. Set VERCEL_DEPLOY_HOOK_URL in Vercel project env — or push to GitHub (auto-deploy when linked).",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Vercel hook failed (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }
    let job: { job?: { id?: string; state?: string } } = {};
    try {
      job = JSON.parse(text) as typeof job;
    } catch {
      /* hook may return plain text */
    }
    return NextResponse.json({
      ok: true,
      message: "Redeploy started on Vercel",
      jobId: job.job?.id ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Deploy hook request failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
