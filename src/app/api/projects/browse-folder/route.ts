import { NextResponse } from "next/server";
import { browseFolderOnWindows } from "@/lib/project-scan/browse-folder";

export const runtime = "nodejs";
export const maxDuration = 130;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { initialPath?: string };
    const result = await browseFolderOnWindows(body.initialPath);
    if (result.cancelled) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browse failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
