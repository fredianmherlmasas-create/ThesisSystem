-- Auto-register admin accounts from auth.users into public.admin_users

-- 1) Admin table
create table if not exists public.admin_users (
  user_id uuid primary key,
  email text unique not null,
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

-- Optional: authenticated users can read only their own mapping
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_users'
      AND policyname = 'Allow authenticated read own admin mapping'
  ) THEN
    CREATE POLICY "Allow authenticated read own admin mapping"
      ON public.admin_users
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 2) Sync function from auth.users
create or replace function public.sync_admin_users_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Keep only accounts marked with app_metadata.role = 'admin'
  if coalesce(new.raw_app_meta_data->>'role', '') = 'admin' then
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict (user_id) do update
    set email = excluded.email;
  else
    delete from public.admin_users where user_id = new.id;
  end if;

  return new;
end;
$$;

-- 3) Trigger on auth.users insert/update
drop trigger if exists trg_sync_admin_users_from_auth on auth.users;

create trigger trg_sync_admin_users_from_auth
after insert or update of email, raw_app_meta_data
on auth.users
for each row
execute function public.sync_admin_users_from_auth();

-- 4) Backfill existing users already marked admin
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where coalesce(raw_app_meta_data->>'role', '') = 'admin'
on conflict (user_id) do update
set email = excluded.email;

-- 5) Helper: mark a user as admin (run when you create a new admin)
-- Replace email below
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'newadmin@yourdomain.com';
