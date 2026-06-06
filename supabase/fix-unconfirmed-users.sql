-- Fix login for accounts created before "Confirm email" was disabled
-- Run in: https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/sql/new

-- 1) See unconfirmed users
select id, email, email_confirmed_at, confirmed_at, created_at
from auth.users
where email_confirmed_at is null
order by created_at desc;

-- 2) Confirm ALL unconfirmed users
-- Note: confirmed_at is auto-generated — only update email_confirmed_at
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

-- 3) Verify
select email, email_confirmed_at, confirmed_at
from auth.users
order by created_at desc;

-- Or delete one stuck user and sign up fresh (replace email)
-- delete from auth.users where email = 'YOUR_EMAIL@example.com';
