#!/usr/bin/env node

/**
 * Fix stuck auth users using the Supabase service role key (admin API).
 *
 * Get secret key: Dashboard → Project Settings → API → secret / service_role key
 * Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-auth-user.mjs list
 *   node --env-file=.env.local scripts/fix-auth-user.mjs confirm-all
 *   node --env-file=.env.local scripts/fix-auth-user.mjs delete user@email.com
 *   node --env-file=.env.local scripts/fix-auth-user.mjs reset user@email.com newpassword123
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const command = process.argv[2];
const arg = process.argv[3];
const arg2 = process.argv[4];

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n\n" +
      "Get the secret key from:\n" +
      "https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/settings/api",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;

  if (!data.users.length) {
    console.log("No users found.");
    return;
  }

  for (const user of data.users) {
    console.log(
      `${user.email} | confirmed: ${Boolean(user.email_confirmed_at)} | id: ${user.id}`,
    );
  }
}

async function confirmAll() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;

  let fixed = 0;
  for (const user of data.users) {
    if (user.email_confirmed_at) continue;

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      console.error(`Failed to confirm ${user.email}:`, updateError.message);
    } else {
      console.log(`Confirmed: ${user.email}`);
      fixed += 1;
    }
  }

  console.log(`Done. Confirmed ${fixed} user(s).`);
}

async function deleteUser(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;

  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) throw deleteError;

  console.log(`Deleted user: ${email}`);
}

async function resetUser(email, password) {
  await deleteUser(email).catch(() => {});

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;

  console.log(`Created fresh confirmed user: ${email}`);
  console.log("You can sign in now at http://localhost:3001/login");
}

try {
  switch (command) {
    case "list":
      await listUsers();
      break;
    case "confirm-all":
      await confirmAll();
      break;
    case "delete":
      if (!arg) throw new Error("Provide an email: delete user@email.com");
      await deleteUser(arg);
      break;
    case "reset":
      if (!arg || !arg2) {
        throw new Error("Provide email and password: reset user@email.com mypassword");
      }
      await resetUser(arg, arg2);
      break;
    default:
      console.error(
        "Commands: list | confirm-all | delete <email> | reset <email> <password>",
      );
      process.exit(1);
  }
} catch (error) {
  console.error(error.message ?? error);
  process.exit(1);
}
