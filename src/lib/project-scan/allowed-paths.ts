import path from "path";
import { DEFAULT_PROJECTS_ROOT, EXTRA_SCAN_ROOTS } from "@/lib/discovery/catalog";
import { COMMAND_CENTER_ROOT } from "@/lib/command-center/paths";

const ALLOWED_ROOTS = [
  DEFAULT_PROJECTS_ROOT,
  ...EXTRA_SCAN_ROOTS,
  COMMAND_CENTER_ROOT,
].map((r) => path.normalize(r).toLowerCase());

export function isAllowedProjectPath(target: string): boolean {
  const normalized = path.normalize(target).toLowerCase();
  return ALLOWED_ROOTS.some((root) => normalized.startsWith(root));
}

export { ALLOWED_ROOTS };
