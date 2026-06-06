#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !anonKey || !email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/test-auth.mjs <email> <password>");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

console.log("Testing sign-in for:", email);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error) {
  console.error("Sign-in failed:", error.message);
  process.exit(1);
}

console.log("Sign-in OK. User:", data.user?.email);
console.log("Session:", data.session ? "yes" : "no");
