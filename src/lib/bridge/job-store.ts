import fs from "fs";
import path from "path";
import os from "os";

export type BridgeJob = {
  id: string;
  tokenHash: string;
  folderPath: string;
  prompt?: string;
  createdAt: string;
  status: "pending" | "done";
};

const FILE = path.join(os.tmpdir(), "jeff-os-bridge-jobs.json");
const MAX_AGE_MS = 15 * 60 * 1000;

type Store = { jobs: BridgeJob[] };

function readStore(): Store {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
    }
  } catch {
    /* ignore */
  }
  const g = globalThis as typeof globalThis & { __jeffBridgeJobs?: Store };
  return g.__jeffBridgeJobs ?? { jobs: [] };
}

function writeStore(store: Store) {
  const g = globalThis as typeof globalThis & { __jeffBridgeJobs?: Store };
  g.__jeffBridgeJobs = store;
  try {
    fs.writeFileSync(FILE, JSON.stringify(store), "utf8");
  } catch {
    /* /tmp may be read-only in some runtimes — memory still works per instance */
  }
}

function prune(store: Store): Store {
  const cutoff = Date.now() - MAX_AGE_MS;
  return {
    jobs: store.jobs.filter((j) => Date.parse(j.createdAt) >= cutoff && j.status === "pending"),
  };
}

export function hashToken(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0;
  return `t${Math.abs(h)}`;
}

export function enqueueBridgeJob(input: {
  token: string;
  folderPath: string;
  prompt?: string;
}): BridgeJob {
  const store = prune(readStore());
  const job: BridgeJob = {
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tokenHash: hashToken(input.token.trim()),
    folderPath: input.folderPath.trim(),
    prompt: input.prompt?.trim() || undefined,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  store.jobs.push(job);
  writeStore(store);
  return job;
}

export function pollBridgeJob(token: string): BridgeJob | null {
  const store = prune(readStore());
  const hash = hashToken(token.trim());
  const job = store.jobs.find((j) => j.status === "pending" && j.tokenHash === hash);
  return job ?? null;
}

export function ackBridgeJob(token: string, id: string): boolean {
  const store = readStore();
  const hash = hashToken(token.trim());
  const job = store.jobs.find((j) => j.id === id && j.tokenHash === hash);
  if (!job) return false;
  job.status = "done";
  writeStore(prune(store));
  return true;
}
