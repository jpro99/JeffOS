import type { BotDefinition, Project } from "@/lib/types";

function projectIntentText(project: Project): string {
  const pitch = project.orchestration?.scope.pitch || project.description.slice(0, 120);
  return [pitch, project.description, ...project.goals].filter(Boolean).join("\n").trim();
}

export function resolveSuggestedGodBot(project: Project, bots: BotDefinition[]): BotDefinition {
  const godBots = bots.filter((b) => b.type === "project-god-bot");
  const slug = project.slug.toLowerCase();
  const nameLower = project.name.toLowerCase();
  const text = projectIntentText(project).toLowerCase();

  const byProject = godBots.find((b) => b.projectIds.includes(project.id));
  if (byProject) return byProject;

  const bySlug = godBots.find((b) =>
    b.projectIds.some((pid) => {
      const tail = pid.replace(/^proj-/, "");
      return tail === slug || slug.includes(tail) || tail.includes(slug);
    }),
  );
  if (bySlug) return bySlug;

  if (/jeff.?os|mission.?control|project command/i.test(text)) {
    return godBots.find((b) => b.id === "bot-god-jeff-os") ?? godBots[0];
  }

  const byName = godBots.find((b) => {
    const token = b.name.toLowerCase().replace(/\s+god bot$/i, "").trim();
    return token.length > 3 && (nameLower.includes(token) || text.includes(token));
  });
  if (byName) return byName;

  if (project.discoverySource === "manual" || project.type === "Greenfield") {
    return godBots.find((b) => b.id === "bot-god-keps") ?? godBots[0];
  }

  return godBots.find((b) => b.id === "bot-god-keps") ?? godBots[0];
}
