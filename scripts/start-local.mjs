#!/usr/bin/env node

/**
 * One command to run Soul Writer locally at http://localhost:3001
 * Usage: npm run local:start
 */

import { existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { createConnection } from "node:net";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3001;
const ENV_PATH = join(root, ".env.local");

const ENV_CONTENT = `NEXT_PUBLIC_SUPABASE_URL=https://wqdbvjxsxcjwifnfgkjf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_s84fExZo-ByvqVqJ2ymrDg_eP_LE6GM
NEXT_PUBLIC_SITE_URL=http://localhost:3001
GEMINI_API_KEY=AIzaSyBGAkeFlYDO30qzZK9lOOwWDEXfwXFWY7g
`;

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function portOpen() {
  return new Promise((resolve) => {
    const socket = createConnection({ port: PORT, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function killPort() {
  try {
    execSync("pkill -f 'next dev' 2>/dev/null", { stdio: "ignore", shell: true });
  } catch {
    /* none */
  }
  if (process.platform === "win32") {
    try {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /F /PID %a`,
        { stdio: "ignore", shell: true },
      );
    } catch {
      /* free */
    }
    return;
  }
  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null`, { stdio: "ignore", shell: true });
  } catch {
    /* free */
  }
  try {
    execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    /* free */
  }
}

async function waitForServer(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/login`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// 1. .env.local
if (!existsSync(ENV_PATH)) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(ENV_PATH, ENV_CONTENT, "utf8");
  log("env", "Created .env.local");
} else {
  log("env", ".env.local OK");
}

// 2. node_modules
if (!existsSync(join(root, "node_modules"))) {
  log("install", "Running npm install…");
  execSync("npm install", { stdio: "inherit", cwd: root });
} else {
  log("install", "node_modules OK");
}

// 3. Supabase check
log("check", "Verifying Supabase…");
try {
  execSync("node --env-file=.env.local scripts/local-setup.mjs", {
    stdio: "inherit",
    cwd: root,
  });
} catch {
  process.exit(1);
}

// 4. Free port 3001
if (await portOpen()) {
  log("port", `Port ${PORT} busy — freeing it…`);
  killPort();
  await new Promise((r) => setTimeout(r, 1500));
  if (await portOpen()) {
    log("port", `Port ${PORT} still busy — try: npm run dev:reset`);
    process.exit(1);
  }
}

log("dev", `Starting Next.js → http://localhost:${PORT}\n`);

const child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
  cwd: root,
  env: { ...process.env },
});

let opened = false;
const maybeOpen = (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  if (!opened && text.includes("Ready")) {
    opened = true;
    void (async () => {
      const ok = await waitForServer();
      if (ok) {
        console.log(`\n✓ Soul Writer is live at http://localhost:${PORT}\n`);
        if (process.platform === "darwin") {
          try {
            execSync(`open http://localhost:${PORT}`, { stdio: "ignore" });
          } catch {
            /* optional */
          }
        }
      }
    })();
  }
};

child.stdout?.on("data", maybeOpen);
child.stderr?.on("data", (c) => process.stderr.write(c));
child.on("exit", (code) => process.exit(code ?? 0));
