#!/usr/bin/env node

/**
 * Starts the Soul Writer dev server on port 3001.
 * Kills any stale process on that port first (common after agent restarts).
 */

import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PORT = 3001;

function portInUse() {
  return new Promise((resolve) => {
    const socket = createConnection({ port: PORT, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function killPort() {
  const { execSync } = await import("node:child_process");
  try {
    execSync("pkill -f 'next dev' 2>/dev/null", { stdio: "ignore" });
  } catch {
    // no matching process
  }
  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null`, { stdio: "ignore" });
  } catch {
    // nothing listening
  }
  await new Promise((r) => setTimeout(r, 1200));
}

if (await portInUse()) {
  console.log(`Port ${PORT} in use — stopping stale process…`);
  await killPort();
}

console.log(`Starting Soul Writer on http://localhost:${PORT}\n`);

const child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  stdio: "inherit",
  shell: true,
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
