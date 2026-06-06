-- Fix login for accounts created before "Confirm email" was disabled
-- Run in: https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/sql/new

-- See unconfirmed users
select id, email, email_confirmed_at, created_at
from auth.users
where email_confirmed_at is null
order by created_at desc;

-- Confirm ALL unconfirmed users (safe for a personal dev project)
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmed_at = coalesce(confirmed_at, now())
where email_confirmed_at is null;

-- Or delete one stuck user and sign up fresh (replace email)
-- delete from auth.users where email = 'YOUR_EMAIL@example.com';
