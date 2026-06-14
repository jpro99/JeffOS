import { NextResponse } from "next/server";
import { DEFAULT_PROJECTS_ROOT, EXTRA_SCAN_ROOTS } from "@/lib/discovery/catalog";
import { buildProjectsFromScan } from "@/lib/discovery/merge";
import { scanProjectsDisk } from "@/lib/discovery/scanner";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeUnknown = url.searchParams.get("unknown") !== "false";
    const rootsParam = url.searchParams.get("roots");
    const roots = rootsParam
      ? rootsParam.split("|").map((r) => r.trim()).filter(Boolean)
      : [DEFAULT_PROJECTS_ROOT, ...EXTRA_SCAN_ROOTS];

    const scan = scanProjectsDisk(roots);
    const existingRaw = url.searchParams.get("existing");
    let existing: Project[] = [];
    if (existingRaw) {
      try {
        existing = JSON.parse(decodeURIComponent(existingRaw)) as Project[];
      } catch {
        existing = [];
      }
    }

    const { projects, added, updated } = buildProjectsFromScan(scan, existing, includeUnknown);

    return NextResponse.json({
      ok: true,
      scan: {
        scannedAt: scan.scannedAt,
        roots: scan.roots,
        folderCount: scan.folders.length,
        catalogMatchCount: scan.catalogMatches.length,
        missingPaths: scan.missingCatalogPaths,
        unknownCount: scan.unknownFolders.length,
      },
      projects,
      stats: { added, updated, total: projects.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roots?: string[];
      includeUnknown?: boolean;
      existing?: Project[];
    };

    const roots = body.roots?.length ? body.roots : [DEFAULT_PROJECTS_ROOT, ...EXTRA_SCAN_ROOTS];
    const scan = scanProjectsDisk(roots);
    const { projects, added, updated } = buildProjectsFromScan(
      scan,
      body.existing ?? [],
      body.includeUnknown ?? true,
    );

    return NextResponse.json({
      ok: true,
      scan: {
        scannedAt: scan.scannedAt,
        roots: scan.roots,
        folderCount: scan.folders.length,
        catalogMatchCount: scan.catalogMatches.length,
        missingPaths: scan.missingCatalogPaths,
        unknownCount: scan.unknownFolders.length,
      },
      projects,
      stats: { added, updated, total: projects.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
