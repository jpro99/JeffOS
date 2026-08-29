#!/usr/bin/env node
/**
 * Jeff OS Bridge — runs on your PC so Lemon (Vercel) can open Cursor.
 *
 *   npm run bridge
 *
 * Then on Lemon → Easy Settings → paste Bridge URL + token (printed below).
 * Same Wi‑Fi: http://YOUR-LAN-IP:3927
 * Anywhere: Tailscale MagicDNS / Funnel URL pointing at this port.
 */
import http from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.JEFF_BRIDGE_PORT || 3927);
const STATE_DIR = path.join(os.homedir(), ".jeff-os");
const STATE_FILE = path.join(STATE_DIR, "bridge.json");
const LEMON = (process.env.JEFF_OS_LEMON_URL || "https://project-command-lemon.vercel.app").replace(
  /\/+$/,
  "",
);

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {
    /* ignore */
  }
  const token = crypto.randomBytes(16).toString("hex");
  const state = { token, createdAt: new Date().toISOString() };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  return state;
}

const state = loadState();
const TOKEN = process.env.JEFF_BRIDGE_TOKEN || state.token;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Jeff-Bridge-Token");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function tokenOk(req, body) {
  const header =
    req.headers["x-jeff-bridge-token"] ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const q = new URL(req.url || "/", "http://x").searchParams.get("token");
  const got = header || q || body?.token || "";
  return got && got === TOKEN;
}

function isAllowedPath(folderPath) {
  const roots = ["C:\\Projects", "C:\\vercel generator", ROOT];
  const norm = folderPath.replace(/\//g, "\\").toLowerCase();
  return roots.some((r) => norm.startsWith(r.toLowerCase()));
}

async function openCursor(folderPath, prompt) {
  let promptFile = null;
  if (prompt?.trim()) {
    const dir = path.join(folderPath, ".jeff-os");
    fs.mkdirSync(dir, { recursive: true });
    promptFile = path.join(dir, "last-agent-prompt.md");
    fs.writeFileSync(
      promptFile,
      `# Jeff OS → Cursor (from Lemon bridge)\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n${prompt.trim()}\n`,
      "utf8",
    );
  }

  const target = promptFile || folderPath;
  try {
    await execFileAsync("cursor", [target], { windowsHide: true });
  } catch {
    await execFileAsync("cmd.exe", ["/c", "start", "", "cursor", target], { windowsHide: true });
  }
  return promptFile ? ".jeff-os/last-agent-prompt.md" : null;
}

async function handleOpen(body) {
  const folderPath = String(body.folderPath || "").trim();
  const prompt = body.prompt ? String(body.prompt) : undefined;
  if (!folderPath) return { status: 400, json: { ok: false, error: "No folder path" } };
  if (!isAllowedPath(folderPath)) {
    return { status: 403, json: { ok: false, error: "Path not in allowed project roots" } };
  }
  if (!fs.existsSync(folderPath)) {
    return { status: 404, json: { ok: false, error: "Folder not found on this PC" } };
  }
  const promptFile = await openCursor(folderPath, prompt);
  return {
    status: 200,
    json: {
      ok: true,
      promptFile,
      message: promptFile
        ? `Opened Cursor with ${promptFile} — paste clipboard or @ that file in Agent`
        : `Opened ${folderPath} in Cursor`,
    },
  };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "jeff-os-bridge", port: PORT }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/setup") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          port: PORT,
          token: TOKEN,
          lemon: LEMON,
          hint: "Paste bridgeUrl + bridgeToken into Lemon Easy Settings",
        }),
      );
      return;
    }

    if (req.method === "POST" && (url.pathname === "/open-cursor" || url.pathname === "/")) {
      const body = await readBody(req);
      if (!tokenOk(req, body)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Bad bridge token" }));
        return;
      }
      const out = await handleOpen(body);
      res.writeHead(out.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(out.json));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Not found" }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Bridge error" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === "IPv4" && !n.internal) ips.push(n.address);
    }
  }

  console.log("");
  console.log("JEFF OS BRIDGE — Lemon can open Cursor on this PC");
  console.log("------------------------------------------------");
  console.log(`Listening:  http://127.0.0.1:${PORT}`);
  for (const ip of ips) console.log(`LAN:        http://${ip}:${PORT}`);
  console.log(`Token:      ${TOKEN}`);
  console.log("");
  console.log("On Lemon (phone/browser):");
  console.log("  1. Easy → Settings → PC Bridge");
  console.log(`  2. Bridge URL = http://YOUR-LAN-OR-TAILSCALE-IP:${PORT}`);
  console.log(`  3. Bridge token = ${TOKEN}`);
  console.log("  4. Test bridge → then Add to project → Go");
  console.log("");
  console.log(`Polling Lemon jobs: ${LEMON}/api/bridge/poll`);
  console.log("Keep this window open while you use Lemon.");
  console.log("");

  startPollLoop();
});

async function startPollLoop() {
  const pollUrl = `${LEMON}/api/bridge/poll?token=${encodeURIComponent(TOKEN)}`;
  for (;;) {
    try {
      const res = await fetch(pollUrl, { headers: { "X-Jeff-Bridge-Token": TOKEN } });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.job?.folderPath) {
          console.log(`[poll] job ${data.job.id} → ${data.job.folderPath}`);
          const out = await handleOpen(data.job);
          console.log(`[poll] ${out.json.message || out.json.error}`);
          await fetch(`${LEMON}/api/bridge/ack`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Jeff-Bridge-Token": TOKEN,
            },
            body: JSON.stringify({ token: TOKEN, id: data.job.id }),
          }).catch(() => {});
        }
      }
    } catch {
      /* Lemon unreachable — fine when offline */
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
}
