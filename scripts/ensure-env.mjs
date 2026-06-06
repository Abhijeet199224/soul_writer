#!/usr/bin/env node

/**
 * Creates .env.local on your Mac if missing (gitignored — not in clone).
 */

import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

if (existsSync(envPath)) {
  console.log(".env.local already exists — skipping.");
  process.exit(0);
}

const content = `NEXT_PUBLIC_SUPABASE_URL=https://wqdbvjxsxcjwifnfgkjf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_s84fExZo-ByvqVqJ2ymrDg_eP_LE6GM
NEXT_PUBLIC_SITE_URL=http://localhost:3001
GEMINI_API_KEY=AIzaSyBGAkeFlYDO30qzZK9lOOwWDEXfwXFWY7g
`;

writeFileSync(envPath, content, "utf8");
console.log("Created .env.local with your Supabase + Gemini keys.");
