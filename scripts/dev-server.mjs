#!/usr/bin/env node

/**
 * Kills anything on port 3001, then starts next dev.
 * Use: npm run dev:reset  (when port 3001 is stuck)
 * Normal local dev: npm run dev
 */

import { spawn, execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3001;

function killPort() {
  if (process.platform === "win32") {
    try {
      execSync(
        `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT}') do taskkill /F /PID %a`,
        { stdio: "ignore", shell: true },
      );
    } catch {
      // nothing to kill
    }
    return;
  }

  try {
    execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // port already free
  }
}

killPort();
console.log(`Starting Soul Writer on http://localhost:${PORT}\n`);

const child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  stdio: "inherit",
  shell: true,
  cwd: root,
});

child.on("exit", (code) => process.exit(code ?? 0));
