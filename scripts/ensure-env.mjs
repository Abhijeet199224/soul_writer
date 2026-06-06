#!/usr/bin/env node

/**
 * Creates .env.local from .env.example if missing.
 * Never embeds real API keys in source code.
 */

import { existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
const examplePath = join(root, ".env.example");

if (existsSync(envPath)) {
  console.log(".env.local already exists — skipping.");
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error("Missing .env.example");
  process.exit(1);
}

copyFileSync(examplePath, envPath);
console.log("Created .env.local from .env.example");
console.log("Edit .env.local and add your Supabase + Gemini keys before running AI features.");
