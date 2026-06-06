#!/usr/bin/env node

/**
 * Applies the initial Soul Writer schema to a Supabase project.
 *
 * Requires:
 *   SUPABASE_DB_URL — Postgres connection string from
 *   Dashboard → Project Settings → Database → Connection string (URI)
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://..." node scripts/apply-schema.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Client } = pg;
const root = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(
  root,
  "../supabase/migrations/20250606120000_initial_schema.sql",
);

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL.\n\n" +
      "Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI).\n" +
      "Then run:\n" +
      '  SUPABASE_DB_URL="postgresql://..." npm run db:apply',
  );
  process.exit(1);
}

const sql = readFileSync(migrationPath, "utf8");
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.");
} catch (error) {
  console.error("Failed to apply schema:", error.message);
  process.exit(1);
} finally {
  await client.end();
}
