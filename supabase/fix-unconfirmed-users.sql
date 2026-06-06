-- Fix stuck login (run in SQL Editor)
-- https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/sql/new

-- 1) See all users
select id, email, email_confirmed_at, confirmed_at, created_at
from auth.users
order by created_at desc;

-- 2) Confirm unconfirmed users (confirmed_at is auto-generated — do not set it)
update auth.users
set
  email_confirmed_at = now(),
  raw_user_meta_data = jsonb_set(
    coalesce(raw_user_meta_data, '{}'::jsonb),
    '{email_verified}',
    'true'::jsonb,
    true
  )
where email_confirmed_at is null;

-- 3) Sync identity records
update auth.identities
set identity_data = jsonb_set(
  coalesce(identity_data, '{}'::jsonb),
  '{email_verified}',
  'true'::jsonb,
  true
)
where user_id in (
  select id from auth.users where email_confirmed_at is not null
);

-- 4) NUCLEAR OPTION — delete ONE user completely and sign up again in the app
-- Replace the email below:
/*
delete from auth.identities
where user_id in (select id from auth.users where email = 'YOUR_EMAIL@example.com');

delete from auth.users
where email = 'YOUR_EMAIL@example.com';
*/
