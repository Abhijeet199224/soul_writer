#!/usr/bin/env node

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

async function check(path, label) {
  const response = await fetch(`${url}${path}`, { headers });
  const body = await response.text();
  console.log(`${label}: HTTP ${response.status}`);
  if (!response.ok) {
    console.log(body.slice(0, 300));
  }
  return response.ok;
}

console.log("Soul Writer setup check\n");
await check("/auth/v1/health", "Auth");
const storiesOk = await check("/rest/v1/stories?select=id&limit=1", "Stories table");

if (!storiesOk) {
  console.log("\nStories table missing. Run the SQL migration:");
  console.log("https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/sql/new");
  process.exit(1);
}

console.log("\nAll checks passed.");
