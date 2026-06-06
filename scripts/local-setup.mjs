#!/usr/bin/env node

/**
 * Verifies your Mac is ready for local dev (Step 1).
 * Usage: node --env-file=.env.local scripts/local-setup.mjs
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

console.log("Soul Writer — local dev check\n");

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 18) {
  console.error("Node 18+ required. Install from https://nodejs.org");
  process.exit(1);
}
console.log(`Node ${process.versions.node} ✓`);

if (!existsSync(envPath)) {
  console.error("\nMissing .env.local — run:\n  cp .env.example .env.local");
  console.error("Then add your Supabase keys from the dashboard.");
  process.exit(1);
}
console.log(".env.local ✓");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key || key.includes("your_")) {
  console.error("\nSet NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}
console.log("Supabase env vars ✓");

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const auth = await fetch(`${url}/auth/v1/health`, { headers });
const stories = await fetch(`${url}/rest/v1/stories?select=id&limit=1`, { headers });

console.log(`Supabase auth: HTTP ${auth.status}`);
console.log(`Stories table: HTTP ${stories.status}`);

if (!stories.ok) {
  console.error("\nDatabase not ready. Run both migrations in Supabase SQL Editor:");
  console.error("  supabase/migrations/20250606120000_initial_schema.sql");
  console.error("  supabase/migrations/20250606200000_story_workspace.sql");
  process.exit(1);
}

console.log("\n✓ Ready for local dev.\n");
console.log("  npm run dev");
console.log("  open http://localhost:3001\n");
