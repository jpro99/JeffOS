import "server-only";
import path from "path";

/** Jeff OS repo root (where npm run dev runs). */
export function getRepoRoot(): string {
  return path.normalize(/* turbopackIgnore: true */ process.cwd());
}

export function repoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}
