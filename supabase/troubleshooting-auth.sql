-- Soul Writer: fix login when confirmation emails are not received
-- Run in: https://supabase.com/dashboard/project/wqdbvjxsxcjwifnfgkjf/sql/new

-- 1) See registered users (find your email)
select id, email, email_confirmed_at, created_at
from auth.users
order by created_at desc;

-- 2) Manually confirm ONE user (replace with your email)
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  confirmed_at = coalesce(confirmed_at, now())
where email = 'YOUR_EMAIL@example.com';

-- 3) Verify
select email, email_confirmed_at from auth.users where email = 'YOUR_EMAIL@example.com';
