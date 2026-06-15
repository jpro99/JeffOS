import type { GitStatusSnapshot } from "@/lib/project-scan/git-status";
import type { Project } from "@/lib/types";
import { isJeffOsProject } from "@/lib/projects/jeff-os";

export interface PushLiveTarget {
  projectId: string;
  projectName: string;
  repoPath: string;
  githubUrl: string | null;
  branch: string;
  isJeffOs: boolean;
}

export function resolvePushLiveTarget(project: Project, git?: GitStatusSnapshot | null): PushLiveTarget | null {
  if (!project.path?.trim()) return null;
  const gh =
    project.github ??
    project.connections?.find((c) => c.kind === "github")?.url ??
    null;
  return {
    projectId: project.id,
    projectName: project.name,
    repoPath: project.path,
    githubUrl: gh,
    branch: git?.branch || "main",
    isJeffOs: isJeffOsProject(project),
  };
}

/** PowerShell one-liner for this project's folder */
export function buildPushLiveShellCommand(project: Project, message?: string): string | null {
  const target = resolvePushLiveTarget(project);
  if (!target) return null;
  const msg = (message ?? `${project.name} live update`).replace(/"/g, '`"');
  if (target.isJeffOs) {
    return `cd "${target.repoPath}"; npm run push-live`;
  }
  return `cd "${target.repoPath}"; if (Test-Path package.json) { npm run build }; git add -A; git diff --cached --quiet; if ($LASTEXITCODE -ne 0) { git commit -m "${msg}"; git push origin ${target.branch} }`;
}

/** Cursor agent prompt — paste in chat on this project folder */
export function buildCursorPushLivePrompt(
  project: Project,
  git?: GitStatusSnapshot | null,
): string | null {
  const target = resolvePushLiveTarget(project, git);
  if (!target) return null;

  const gitBlock = git
    ? `Git now: ${git.summary}
Branch: ${git.branch || target.branch}
Remote: ${git.remoteUrl || "check git remote -v"}
Changed files: ${git.changedFiles}`
    : "Run git status first.";

  return `# PUSH LIVE — ${target.projectName}
Jeff OS picked this repo from your active project. Push it so GitHub (and Vercel if linked) go live.

═══════════════════════════════════════
REPO (use exactly)
═══════════════════════════════════════
Folder: ${target.repoPath}
GitHub: ${target.githubUrl ?? "add remote if missing"}

${gitBlock}

═══════════════════════════════════════
DO IN ORDER — you run the commands
═══════════════════════════════════════
1. cd "${target.repoPath}"
2. npm run build — skip only if no package.json build script
3. git status
4. git add -A
5. git commit -m "${target.projectName}: [one line what changed]"
6. git push origin ${target.branch}
7. Reply exactly: PUSH DONE — [branch + commit one-liner]

Rules:
- Real code on disk — no placeholders
- Never force-push main/master unless Jeff asks
- If build fails, fix first then push
- Minimal diff

Voice: caveman — short, direct.
`;
}

export const AUTO_DEPLOY_STEPS = [
  {
    step: 1,
    title: "Link Vercel to GitHub (one time per repo)",
    body: "Vercel → Import the GitHub repo for this project → Production branch main.",
  },
  {
    step: 2,
    title: "Auto-deploy is ON after link",
    body: "Every git push to main rebuilds that project's Vercel site (~1–2 min).",
  },
  {
    step: 3,
    title: "Push the active project",
    body: "Pick project in Jeff OS → Copy → paste in Cursor OR Push now (localhost only).",
  },
] as const;
