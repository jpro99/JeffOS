"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMissionControl } from "@/lib/store/context";
import { Card, CardTitle } from "@/components/ui/Card";

export default function NewProjectPage() {
  const router = useRouter();
  const { createProject, openWorkspace } = useMissionControl();
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["web"]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const submit = () => {
    if (!name.trim()) return;
    const project = createProject({
      name: name.trim(),
      pitch: pitch.trim(),
      description: description.trim() || pitch.trim(),
      goals: goals.split("\n").map((g) => g.trim()).filter(Boolean),
      platforms: platforms.length ? platforms : ["web"],
    });
    openWorkspace(project.id);
    router.push(`/projects/${project.id}?tab=scope`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/projects" className="text-sm text-zinc-600 hover:text-teal-500">
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-50">New project</h1>
        <p className="mt-1 text-zinc-500">Define scope. Then brainstorm features and approve the orchestra plan.</p>
      </div>

      <Card className="space-y-4">
        <CardTitle>Scope intake</CardTitle>
        <label className="block text-xs text-zinc-600">
          Project name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200"
            placeholder="My New App"
          />
        </label>
        <label className="block text-xs text-zinc-600">
          One-line pitch
          <input
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200"
            placeholder="What is this in one sentence?"
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200"
          />
        </label>
        <label className="block text-xs text-zinc-600">
          Goals (one per line)
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200"
          />
        </label>
        <div>
          <p className="text-xs text-zinc-600">Platforms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["web", "mobile", "desktop", "api"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${
                  platforms.includes(p)
                    ? "bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/30"
                    : "border border-white/10 text-zinc-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="w-full rounded-full bg-teal-500/15 py-3 text-sm font-medium text-teal-200 ring-1 ring-teal-500/25 disabled:opacity-40"
        >
          Create & open scope
        </button>
      </Card>
    </div>
  );
}
