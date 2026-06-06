#!/usr/bin/env node

/**
 * Configures Supabase Auth for real email verification via Resend SMTP.
 *
 * Required in .env.local (or environment):
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   RESEND_API_KEY         — https://resend.com/api-keys
 *   SMTP_SENDER_EMAIL      — e.g. onboarding@resend.dev (testing) or noreply@yourdomain.com
 *   NEXT_PUBLIC_SITE_URL   — e.g. http://localhost:3001
 *
 * Usage:
 *   node --env-file=.env.local scripts/configure-auth-email.mjs
 */

const PROJECT_REF = "wqdbvjxsxcjwifnfgkjf";

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail = process.env.SMTP_SENDER_EMAIL ?? "onboarding@resend.dev";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(
  /\/$/,
  "",
);
const senderName = process.env.SMTP_SENDER_NAME ?? "Soul Writer";

if (!accessToken || !resendApiKey) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN or RESEND_API_KEY.\n\n" +
      "1. Create a Supabase access token: https://supabase.com/dashboard/account/tokens\n" +
      "2. Create a Resend API key: https://resend.com/api-keys\n" +
      "3. Add both to .env.local, then run: npm run auth:configure",
  );
  process.exit(1);
}

const redirectUrls = [
  `${siteUrl}/auth/callback`,
  `${siteUrl}/**`,
  "http://localhost:3000/auth/callback",
  "http://localhost:3001/auth/callback",
].join(",");

const payload = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  site_url: siteUrl,
  uri_allow_list: redirectUrls,
  smtp_admin_email: senderEmail,
  smtp_sender_name: senderName,
  smtp_host: "smtp.resend.com",
  smtp_port: 465,
  smtp_user: "resend",
  smtp_pass: resendApiKey,
};

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  },
);

const body = await response.text();

if (!response.ok) {
  console.error(`Failed to configure auth (HTTP ${response.status}):`);
  console.error(body);
  process.exit(1);
}

console.log("Supabase Auth email configured successfully.");
console.log(`- Site URL: ${siteUrl}`);
console.log(`- Callback: ${siteUrl}/auth/callback`);
console.log(`- Sender: ${senderEmail}`);
console.log("- Email confirmation: enabled");
console.log("\nNext: sign up again and check your inbox.");
