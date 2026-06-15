import { NextResponse } from "next/server";
import { createProjectFolder } from "@/lib/project-scan/create-folder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string };
    const result = await createProjectFolder(body.path ?? "");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create folder";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
