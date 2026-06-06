#!/usr/bin/env node

/**
 * Diagnose why http://localhost:3001 fails on your Mac.
 */

import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3001;

function probe(host) {
  return new Promise((resolve) => {
    const socket = createConnection({ port: PORT, host });
    socket.setTimeout(2000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function httpCheck(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.status;
  } catch (err) {
    return err instanceof Error ? err.message : "failed";
  }
}

console.log("Soul Writer — localhost doctor\n");

const hasEnv = existsSync(join(root, ".env.local"));
const hasModules = existsSync(join(root, "node_modules"));
console.log(`${hasEnv ? "✓" : "✗"} .env.local ${hasEnv ? "found" : "MISSING — run: npm run env:init"}`);
console.log(`${hasModules ? "✓" : "✗"} node_modules ${hasModules ? "found" : "MISSING — run: npm install"}`);

const v4 = await probe("127.0.0.1");
const v6 = await probe("::1");
const localhost = await probe("localhost");

console.log(`\nPort ${PORT} listening:`);
console.log(`  127.0.0.1  → ${v4 ? "YES (server running)" : "NO"}`);
console.log(`  [::1]      → ${v6 ? "YES" : "NO"}`);
console.log(`  localhost  → ${localhost ? "YES" : "NO"}`);

if (!v4 && !v6 && !localhost) {
  console.log("\n✗ Nothing is listening on port 3001 on THIS machine.");
  console.log("  Localtunnel works because the server runs in the Cloud VM, not your Mac.");
  console.log("\n  Fix — in this folder on your Mac, run:\n");
  console.log("    npm run local:start\n");
  console.log("  Then open http://127.0.0.1:3001");
  process.exit(1);
}

const status127 = await httpCheck(`http://127.0.0.1:${PORT}/login`);
const statusLocal = await httpCheck(`http://localhost:${PORT}/login`);

console.log(`\nHTTP /login:`);
console.log(`  http://127.0.0.1:${PORT}  → ${status127}`);
console.log(`  http://localhost:${PORT}  → ${statusLocal}`);

if (status127 === 200 || statusLocal === 200) {
  console.log("\n✓ Local dev is working. Use:");
  console.log(status127 === 200 ? `  http://127.0.0.1:${PORT}` : `  http://localhost:${PORT}`);
} else if (v4 || v6) {
  console.log("\n⚠ Port is open but HTTP failed — check terminal for Next.js errors.");
} else {
  process.exit(1);
}
