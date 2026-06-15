import path from "path";
import { DEFAULT_PROJECTS_ROOT, EXTRA_SCAN_ROOTS } from "@/lib/discovery/catalog";
import { getCommandCenterRoot } from "@/lib/command-center/paths";

function allowedRoots(): string[] {
  return [DEFAULT_PROJECTS_ROOT, ...EXTRA_SCAN_ROOTS, getCommandCenterRoot()].map((r) =>
    path.normalize(r).toLowerCase(),
  );
}

export function isAllowedProjectPath(target: string): boolean {
  const normalized = path.normalize(target).toLowerCase();
  return allowedRoots().some((root) => normalized.startsWith(root));
}

export function getAllowedRoots(): string[] {
  return allowedRoots();
}
